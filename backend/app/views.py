# backend/app/views.py - COMPLETE UPDATED VERSION
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.conf import settings
from django.http import HttpResponse

from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits.sql.toolkit import SQLDatabaseToolkit
from langgraph.prebuilt import create_react_agent

from langchain_postgres import PostgresChatMessageHistory
from langchain_core.messages import HumanMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

import os
import pandas as pd
import re
import io
from io import StringIO
import time
from collections import deque
import numpy as np
from typing import Dict, Any, List
from sqlalchemy import create_engine, text
import logging

logger = logging.getLogger(__name__)

# Import models for chat history
from .models import ChatHistory, UploadedFile, ChatSession


# --- Rate Limiter ---
class RateLimiter:
    """Rate limiter using sliding window"""

    def __init__(self, max_requests=8, time_window=60):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = deque()

    def can_proceed(self):
        current_time = time.time()
        while self.requests and self.requests[0] < current_time - self.time_window:
            self.requests.popleft()
        if len(self.requests) < self.max_requests:
            self.requests.append(current_time)
            return True
        return False

    def wait_time(self):
        if not self.requests:
            return 0
        current_time = time.time()
        oldest_request = self.requests[0]
        time_passed = current_time - oldest_request
        if time_passed >= self.time_window:
            return 0
        return self.time_window - time_passed

    def wait_if_needed(self):
        if not self.can_proceed():
            wait_seconds = self.wait_time()
            logger.warning(f"Rate limit reached. Waiting {wait_seconds:.1f} seconds...")
            time.sleep(wait_seconds + 0.1)
            self.requests.append(time.time())


gemini_rate_limiter = RateLimiter(max_requests=8, time_window=60)


class ConversationalSQLAgent:
    """SQL Agent with conversational memory"""

    def __init__(self, db_uri: str, api_key: str, session_id: str):
        self.db_uri = db_uri
        self.session_id = session_id

        # Initialize base SQL agent
        self.db = SQLDatabase.from_uri(
            db_uri, schema="uploads", include_tables=None, sample_rows_in_table_info=3
        )

        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0,
            openai_api_key=api_key,
            timeout=15,
            max_retries=1,
        )

        # Initialize memory with PostgreSQL
        import psycopg

        self.connection = psycopg.connect(db_uri)
        self.message_history = PostgresChatMessageHistory(
            "chat_message_history", session_id, sync_connection=self.connection
        )
        self.message_history.create_tables(self.connection, "chat_message_history")

        # Create conversational prompt
        self.prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    """You are a helpful SQL assistant with access to a database. You help users query their data.

IMPORTANT RULES:
1. If the question is unclear or lacks necessary details, ASK the user for clarification before generating SQL
2. If you need to know which columns exist, which table to query, or what specific data they want, ASK first
3. Be conversational and remember previous context from the chat history
4. Only generate SQL queries when you have enough information
5. All tables are in the 'uploads' schema - always use 'uploads.table_name' format

Available database schema:
{schema_info}

When you have enough information, respond with:
ACTION: QUERY
SQL: [your sql query here]

When you need clarification, respond with:
ACTION: CLARIFY
QUESTION: [your clarifying question here]""",
                ),
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{input}"),
            ]
        )

        self.toolkit = SQLDatabaseToolkit(db=self.db, llm=self.llm)

    def query_with_conversation(self, user_input: str) -> dict:
        """Process query with conversational context"""
        try:
            gemini_rate_limiter.wait_if_needed()

            # Get schema info
            schema_info = self._get_schema_fast()

            # Get chat history - FIXED: Use message_history directly
            messages = self.message_history.messages

            # Format prompt
            formatted_prompt = self.prompt.format_messages(
                schema_info=schema_info, chat_history=messages, input=user_input
            )

            # Get LLM response
            response = self.llm.invoke(formatted_prompt)
            response_text = response.content.strip()

            # Check if LLM needs clarification
            if "ACTION: CLARIFY" in response_text:
                # Extract question
                question_match = re.search(
                    r"QUESTION:\s*(.+)", response_text, re.DOTALL
                )
                clarifying_question = (
                    question_match.group(1).strip() if question_match else response_text
                )

                # Save to memory - FIXED: Use message_history directly
                self.message_history.add_user_message(user_input)
                self.message_history.add_ai_message(clarifying_question)

                return {
                    "success": True,
                    "needs_clarification": True,
                    "question": clarifying_question,
                    "query": "",
                    "results": pd.DataFrame(),
                    "explanation": clarifying_question,
                }

            # Extract SQL query
            sql_match = re.search(r"SQL:\s*(.+)", response_text, re.DOTALL)
            if sql_match:
                sql_query = sql_match.group(1).strip()
                sql_query = sql_query.replace("```sql", "").replace("```", "").strip()
            else:
                # Try to find SELECT statement
                sql_match = re.search(
                    r"(SELECT\s+.+)", response_text, re.IGNORECASE | re.DOTALL
                )
                if sql_match:
                    sql_query = sql_match.group(1).strip()
                else:
                    # No query found, treat as clarification - FIXED
                    self.message_history.add_user_message(user_input)
                    self.message_history.add_ai_message(response_text)
                    return {
                        "success": True,
                        "needs_clarification": True,
                        "question": response_text,
                        "query": "",
                        "results": pd.DataFrame(),
                        "explanation": response_text,
                    }

            # Security check
            if self._is_query_unsafe(sql_query):
                error_msg = (
                    "Cannot query system tables. Only uploaded data can be queried."
                )
                # FIXED: Use message_history directly
                self.message_history.add_user_message(user_input)
                self.message_history.add_ai_message(error_msg)
                return {
                    "success": False,
                    "error": error_msg,
                    "results": pd.DataFrame(),
                    "query": sql_query,
                    "explanation": "",
                }

            # Execute query
            results = self._execute_query(sql_query)

            if results is None:
                # Try to fix query
                gemini_rate_limiter.wait_if_needed()
                corrected_query = self._fix_query_fast(
                    sql_query, user_input, schema_info
                )
                if corrected_query and not self._is_query_unsafe(corrected_query):
                    results = self._execute_query(corrected_query)
                    if results is not None:
                        sql_query = corrected_query

                if results is None:
                    error_msg = (
                        "Query execution failed. Could you rephrase your question?"
                    )
                    # FIXED: Use message_history directly
                    self.message_history.add_user_message(user_input)
                    self.message_history.add_ai_message(error_msg)
                    return {
                        "success": False,
                        "error": error_msg,
                        "results": pd.DataFrame(),
                        "query": sql_query,
                        "explanation": "",
                    }

            # Generate explanation
            explanation = self._generate_explanation(results, user_input)

            # Save to memory - FIXED: Use message_history directly
            self.message_history.add_user_message(user_input)
            self.message_history.add_ai_message(explanation)

            return {
                "success": True,
                "results": results,
                "query": sql_query,
                "explanation": explanation,
                "needs_clarification": False,
            }

        except Exception as e:
            logger.error(f"Error in conversational query: {str(e)}")
            return {
                "success": False,
                "error": f"Error: {str(e)}",
                "results": pd.DataFrame(),
                "query": "",
                "explanation": "",
            }

    def _is_query_unsafe(self, query: str) -> bool:
        """Check if query tries to access forbidden tables/schemas"""
        query_lower = query.lower()
        forbidden = [
            "public.",
            "information_schema.",
            "chat_history",
            "uploaded_files",
            "chat_message_history",
        ]
        return any(forbidden_item in query_lower for forbidden_item in forbidden)

    def _execute_query(self, query: str) -> pd.DataFrame:
        try:
            engine = create_engine(self.db_uri)
            with engine.connect() as conn:
                result = conn.execute(text(query))
                df = pd.DataFrame(result.fetchall(), columns=result.keys())
                return df
        except Exception as e:
            logger.error(f"Error executing query: {str(e)}")
            return None
        finally:
            if "engine" in locals():
                engine.dispose()

    def _get_schema_fast(self) -> str:
        try:
            engine = create_engine(self.db_uri)
            with engine.connect() as conn:
                tables_query = """
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'uploads'
                    LIMIT 10
                """
                tables_result = conn.execute(text(tables_query))
                tables = [row[0] for row in tables_result]

                if not tables:
                    return "No uploaded data available. Please upload a file first."

                schema_str = "AVAILABLE TABLES (uploads schema):\n\n"
                for table in tables:
                    columns_query = f"""
                        SELECT column_name, data_type 
                        FROM information_schema.columns 
                        WHERE table_schema = 'uploads'
                        AND table_name = '{table}'
                        LIMIT 20
                    """
                    columns_result = conn.execute(text(columns_query))
                    columns = [(row[0], row[1]) for row in columns_result]

                    schema_str += f"\nTable: uploads.{table}\n"
                    for col_name, col_type in columns:
                        schema_str += f"  - {col_name} ({col_type})\n"

                return schema_str
        except Exception as e:
            logger.error(f"Schema fetch error: {str(e)}")
            return "Schema unavailable"
        finally:
            if "engine" in locals():
                engine.dispose()

    def _fix_query_fast(self, failed_query: str, question: str, schema: str) -> str:
        try:
            prompt = f"""Fix this failed query. Make it SIMPLER.

SCHEMA (uploads schema):
{schema}

FAILED QUERY:
{failed_query}

QUESTION: {question}

RULES:
1. ALL tables MUST use 'uploads.' prefix
2. Keep it SIMPLE
3. Add LIMIT 100

Return ONLY the fixed query:"""

            response = self.llm.invoke(prompt)
            fixed_query = response.content.strip()
            fixed_query = fixed_query.replace("```sql", "").replace("```", "").strip()
            return fixed_query if "SELECT" in fixed_query.upper() else None
        except Exception as e:
            logger.error(f"Query fix error: {str(e)}")
            return None

    def _generate_explanation(self, results_df: pd.DataFrame, question: str) -> str:
        try:
            if results_df.empty:
                return "No results found for your query."

            row_count = len(results_df)
            return f"Found {row_count} record{'s' if row_count != 1 else ''} matching your query."
        except Exception as e:
            logger.error(f"Error generating explanation: {str(e)}")
            return "Query executed successfully."


# --- Chart Generator ---
class ChartDataGenerator:
    """Generate chart-ready data from DataFrame"""

    @staticmethod
    def prepare_chart_data(
        df: pd.DataFrame, chart_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        try:
            chart_type = chart_config["type"]
            if chart_type == "bar":
                return ChartDataGenerator._prepare_bar_data(df, chart_config)
            elif chart_type == "line":
                return ChartDataGenerator._prepare_line_data(df, chart_config)
            elif chart_type == "pie":
                return ChartDataGenerator._prepare_pie_data(df, chart_config)
            elif chart_type == "scatter":
                return ChartDataGenerator._prepare_scatter_data(df, chart_config)
            else:
                return ChartDataGenerator._prepare_bar_data(df, chart_config)
        except Exception as e:
            logger.error(f"Error preparing chart data: {str(e)}")
            return {"labels": [], "datasets": [], "error": str(e)}

    @staticmethod
    def _prepare_bar_data(df: pd.DataFrame, config: Dict) -> Dict:
        x_col = config.get("x_column")
        y_col = config.get("y_column")
        aggregation = config.get("aggregation", "sum")
        limit = config.get("data_config", {}).get("limit", 20)

        if not x_col or not y_col:
            return {"labels": [], "datasets": []}

        if aggregation == "count":
            grouped = df.groupby(x_col).size().reset_index(name=y_col)
        elif aggregation == "sum":
            grouped = df.groupby(x_col)[y_col].sum().reset_index()
        elif aggregation == "avg":
            grouped = df.groupby(x_col)[y_col].mean().reset_index()
        else:
            grouped = df[[x_col, y_col]].copy()

        grouped = grouped.nlargest(limit, y_col)
        grouped = grouped.replace([np.inf, -np.inf], np.nan).dropna()
        colors = ChartDataGenerator._generate_colors(len(grouped))

        return {
            "labels": grouped[x_col].astype(str).tolist(),
            "datasets": [
                {
                    "label": y_col,
                    "data": grouped[y_col].tolist(),
                    "backgroundColor": colors,
                    "borderColor": [c.replace("0.8", "1") for c in colors],
                    "borderWidth": 2,
                }
            ],
        }

    @staticmethod
    def _prepare_line_data(df: pd.DataFrame, config: Dict) -> Dict:
        x_col = config.get("x_column")
        y_col = config.get("y_column")
        limit = config.get("data_config", {}).get("limit", 50)

        if not x_col or not y_col:
            return {"labels": [], "datasets": []}

        sorted_df = df[[x_col, y_col]].sort_values(x_col).head(limit)
        sorted_df = sorted_df.replace([np.inf, -np.inf], np.nan).dropna()

        return {
            "labels": sorted_df[x_col].astype(str).tolist(),
            "datasets": [
                {
                    "label": y_col,
                    "data": sorted_df[y_col].tolist(),
                    "borderColor": "rgba(16, 185, 129, 1)",
                    "backgroundColor": "rgba(16, 185, 129, 0.1)",
                    "tension": 0.4,
                    "fill": False,
                    "borderWidth": 3,
                }
            ],
        }

    @staticmethod
    def _prepare_pie_data(df: pd.DataFrame, config: Dict) -> Dict:
        x_col = config.get("x_column")
        y_col = config.get("y_column")
        limit = config.get("data_config", {}).get("limit", 10)

        if not x_col or not y_col:
            return {"labels": [], "datasets": []}

        grouped = df.groupby(x_col)[y_col].sum().reset_index()
        grouped = grouped.nlargest(limit, y_col)
        grouped = grouped.replace([np.inf, -np.inf], np.nan).dropna()
        colors = ChartDataGenerator._generate_colors(len(grouped))

        return {
            "labels": grouped[x_col].astype(str).tolist(),
            "datasets": [
                {
                    "data": grouped[y_col].tolist(),
                    "backgroundColor": colors,
                    "borderWidth": 2,
                    "borderColor": "#1a1a1a",
                }
            ],
        }

    @staticmethod
    def _prepare_scatter_data(df: pd.DataFrame, config: Dict) -> Dict:
        x_col = config.get("x_column")
        y_col = config.get("y_column")
        limit = config.get("data_config", {}).get("limit", 100)

        if not x_col or not y_col:
            return {"datasets": []}

        sample_df = df[[x_col, y_col]].head(limit)
        sample_df = sample_df.replace([np.inf, -np.inf], np.nan).dropna()
        scatter_data = [
            {"x": float(row[x_col]), "y": float(row[y_col])}
            for _, row in sample_df.iterrows()
        ]

        return {
            "datasets": [
                {
                    "label": f"{y_col} vs {x_col}",
                    "data": scatter_data,
                    "backgroundColor": "rgba(236, 72, 153, 0.6)",
                    "borderColor": "rgba(236, 72, 153, 1)",
                    "pointRadius": 6,
                }
            ]
        }

    @staticmethod
    def _generate_colors(count: int) -> List[str]:
        base_colors = [
            "rgba(239, 68, 68, 0.8)",
            "rgba(251, 146, 60, 0.8)",
            "rgba(245, 158, 11, 0.8)",
            "rgba(234, 179, 8, 0.8)",
            "rgba(132, 204, 22, 0.8)",
            "rgba(34, 197, 94, 0.8)",
            "rgba(16, 185, 129, 0.8)",
            "rgba(20, 184, 166, 0.8)",
            "rgba(6, 182, 212, 0.8)",
            "rgba(14, 165, 233, 0.8)",
            "rgba(59, 130, 246, 0.8)",
            "rgba(99, 102, 241, 0.8)",
            "rgba(139, 92, 246, 0.8)",
            "rgba(168, 85, 247, 0.8)",
            "rgba(217, 70, 239, 0.8)",
            "rgba(236, 72, 153, 0.8)",
            "rgba(244, 63, 94, 0.8)",
        ]
        return [base_colors[i % len(base_colors)] for i in range(count)]


# --- Visualization Agent ---
class OptimizedVisualizationAgent:
    """Rule-based visualization agent"""

    def __init__(self, api_key: str = None):
        self.api_key = api_key

    def analyze(self, df: pd.DataFrame, question: str = "") -> Dict[str, Any]:
        try:
            summary = self._analyze_data(df)
            charts = self._recommend_charts_rule_based(df, summary, question)
            insights = self._generate_insights_rule_based(df, summary, question)

            return {
                "success": True,
                "summary": summary,
                "charts": charts,
                "insights": insights,
                "error": "",
            }
        except Exception as e:
            logger.error(f"Error in visualization analysis: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "summary": {},
                "charts": [],
                "insights": "",
            }

    def _analyze_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        summary = {
            "row_count": len(df),
            "column_count": len(df.columns),
            "columns": {},
            "numeric_columns": [],
            "categorical_columns": [],
        }

        for col in df.columns:
            col_data = df[col]
            col_info = {
                "name": col,
                "dtype": str(col_data.dtype),
                "unique_count": int(col_data.nunique()),
            }

            if pd.api.types.is_numeric_dtype(col_data):
                summary["numeric_columns"].append(col)
                if not col_data.isna().all():
                    col_info.update(
                        {"min": float(col_data.min()), "max": float(col_data.max())}
                    )
            else:
                summary["categorical_columns"].append(col)

            summary["columns"][col] = col_info

        return summary

    def _recommend_charts_rule_based(
        self, df: pd.DataFrame, summary: Dict, question: str
    ) -> List[Dict]:
        charts = []
        numeric_cols = summary["numeric_columns"]
        categorical_cols = summary["categorical_columns"]
        question_lower = question.lower()

        # Only generate 1 most relevant chart
        if categorical_cols and numeric_cols:
            cat_col = categorical_cols[0]
            num_col = numeric_cols[0]
            unique_count = summary["columns"][cat_col]["unique_count"]

            if unique_count <= 15:
                charts.append(
                    {
                        "type": "bar",
                        "x_column": cat_col,
                        "y_column": num_col,
                        "title": f"{num_col} by {cat_col}",
                        "description": f"Comparison of {num_col} across {cat_col}",
                        "priority": 1,
                        "aggregation": "sum",
                        "data_config": {"limit": 15},
                    }
                )

        return charts[:1]

    def _generate_insights_rule_based(
        self, df: pd.DataFrame, summary: Dict, question: str
    ) -> str:
        insights = []
        insights.append(
            f"Dataset contains {summary['row_count']:,} records across {summary['column_count']} columns"
        )

        if summary["numeric_columns"] and summary["categorical_columns"]:
            insights.append(
                f"Mix of {len(summary['numeric_columns'])} numeric and {len(summary['categorical_columns'])} categorical fields"
            )

        if summary["categorical_columns"]:
            cat_col = summary["categorical_columns"][0]
            unique_count = summary["columns"][cat_col]["unique_count"]
            insights.append(f"{cat_col} has {unique_count} distinct categories")

        return "\n".join(
            [f"{i + 1}. {insight}" for i, insight in enumerate(insights[:3])]
        )


VisualizationAgent = OptimizedVisualizationAgent


# --- SQL ReAct Agent ---
class OptimizedSQLReActAgent:
    """SQL ReAct Agent with uploads schema isolation"""

    def __init__(self, db_uri: str, api_key: str):
        try:
            self.db_uri = db_uri

            # CRITICAL: Only see uploads schema
            self.db = SQLDatabase.from_uri(
                db_uri,
                schema="uploads",
                include_tables=None,
                sample_rows_in_table_info=3,
            )

            self.llm = ChatOpenAI(
                model="gpt-5-mini",
                temperature=0,
                openai_api_key=api_key,
                timeout=15,
                max_retries=1,
            )

            self.toolkit = SQLDatabaseToolkit(db=self.db, llm=self.llm)
            tools = self.toolkit.get_tools()
            self.agent = create_react_agent(self.llm, tools)

            logger.info("SQL ReAct Agent initialized (uploads schema only)")
        except Exception as e:
            logger.error(f"Error initializing SQL ReAct Agent: {str(e)}")
            raise

    def query(self, question: str) -> dict:
        try:
            gemini_rate_limiter.wait_if_needed()
            schema_info = self._get_schema_fast()

            prompt = f"""Generate a SIMPLE PostgreSQL query to answer this question.

DATABASE SCHEMA (uploads schema only):
{schema_info}

CRITICAL RULES:
1. Return ONLY the SQL query, no explanations
2. ALL table names MUST use 'uploads.' prefix (e.g., uploads.sales_data)
3. Use double quotes for column names with spaces
4. ALWAYS add LIMIT 100
5. Keep it SIMPLE

QUESTION: {question}

Generate query:"""

            response = self.llm.invoke(prompt)
            sql_query = response.content.strip()
            sql_query = sql_query.replace("```sql", "").replace("```", "").strip()

            if not sql_query or "SELECT" not in sql_query.upper():
                return {
                    "success": False,
                    "error": "Could not generate a valid SQL query.",
                    "results": pd.DataFrame(),
                    "query": "",
                    "explanation": "",
                }

            # Security check
            if self._is_query_unsafe(sql_query):
                return {
                    "success": False,
                    "error": "Cannot query system tables. Only uploaded data can be queried.",
                    "results": pd.DataFrame(),
                    "query": sql_query,
                    "explanation": "",
                }

            results = self._execute_query(sql_query)

            if results is None:
                gemini_rate_limiter.wait_if_needed()
                corrected_query = self._fix_query_fast(sql_query, question, schema_info)
                if corrected_query and not self._is_query_unsafe(corrected_query):
                    results = self._execute_query(corrected_query)
                    if results is not None:
                        sql_query = corrected_query

                if results is None:
                    return {
                        "success": False,
                        "error": "Query execution failed. Please rephrase your question.",
                        "results": pd.DataFrame(),
                        "query": sql_query,
                        "explanation": "",
                    }

            if results.empty:
                return {
                    "success": True,
                    "results": pd.DataFrame(),
                    "query": sql_query,
                    "explanation": "No results found for your query.",
                    "message": "No data matches your criteria.",
                }

            return {
                "success": True,
                "results": results,
                "query": sql_query,
                "explanation": f"Query returned {len(results)} records.",
            }
        except Exception as e:
            logger.error(f"Error in SQL query: {str(e)}")
            return {
                "success": False,
                "error": f"Error: {str(e)}",
                "results": pd.DataFrame(),
                "query": "",
                "explanation": "",
            }

    def _is_query_unsafe(self, query: str) -> bool:
        """Check if query tries to access forbidden tables/schemas"""
        query_lower = query.lower()
        forbidden = [
            "public.",
            "information_schema.",
            "chat_history",
            "uploaded_files",
            "user_preferences",
        ]
        return any(forbidden_item in query_lower for forbidden_item in forbidden)

    def _execute_query(self, query: str) -> pd.DataFrame:
        try:
            engine = create_engine(self.db_uri)
            with engine.connect() as conn:
                result = conn.execute(text(query))
                df = pd.DataFrame(result.fetchall(), columns=result.keys())
                return df
        except Exception as e:
            logger.error(f"Error executing query: {str(e)}")
            return None
        finally:
            if "engine" in locals():
                engine.dispose()

    def _get_schema_fast(self) -> str:
        try:
            engine = create_engine(self.db_uri)
            with engine.connect() as conn:
                tables_query = """
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'uploads'
                    LIMIT 10
                """
                tables_result = conn.execute(text(tables_query))
                tables = [row[0] for row in tables_result]

                if not tables:
                    return "No uploaded data available. Please upload a file first."

                schema_str = "AVAILABLE TABLES (uploads schema):\n\n"
                for table in tables:
                    columns_query = f"""
                        SELECT column_name, data_type 
                        FROM information_schema.columns 
                        WHERE table_schema = 'uploads'
                        AND table_name = '{table}'
                        LIMIT 20
                    """
                    columns_result = conn.execute(text(columns_query))
                    columns = [(row[0], row[1]) for row in columns_result]

                    schema_str += f"\nTable: uploads.{table}\n"
                    for col_name, col_type in columns:
                        schema_str += f"  - {col_name} ({col_type})\n"

                return schema_str
        except Exception as e:
            logger.error(f"Schema fetch error: {str(e)}")
            return "Schema unavailable"
        finally:
            if "engine" in locals():
                engine.dispose()

    def _fix_query_fast(self, failed_query: str, question: str, schema: str) -> str:
        try:
            prompt = f"""Fix this failed query. Make it SIMPLER.

SCHEMA (uploads schema):
{schema}

FAILED QUERY:
{failed_query}

QUESTION: {question}

RULES:
1. ALL tables MUST use 'uploads.' prefix
2. Keep it SIMPLE
3. Add LIMIT 100

Return ONLY the fixed query:"""

            response = self.llm.invoke(prompt)
            fixed_query = response.content.strip()
            fixed_query = fixed_query.replace("```sql", "").replace("```", "").strip()
            return fixed_query if "SELECT" in fixed_query.upper() else None
        except Exception as e:
            logger.error(f"Query fix error: {str(e)}")
            return None


# --- Utility Functions ---
def get_api_key():
    try:
        return settings.OPENAI_API_KEY  # Changed from GOOGLE_API_KEY
    except AttributeError:
        from dotenv import load_dotenv

        load_dotenv()
        api_key = os.getenv("OPENAI_API_KEY")  # Changed from GOOGLE_API_KEY
        if not api_key:
            raise Exception("OpenAI API key not found")  # Updated message
        return api_key


def generate_result_explanation(results_df, user_question, llm):
    try:
        row_count = len(results_df)
        if row_count == 0:
            return "No results found. The query returned no data."

        data_summary = f"Query returned {row_count} records with {len(results_df.columns)} columns.\n\n"
        data_summary += "Columns:\n"
        for column in results_df.columns:
            col_data = results_df[column]
            if pd.api.types.is_numeric_dtype(col_data) and not col_data.isna().all():
                data_summary += f"- {column}: numeric, range {col_data.min():.2f} to {col_data.max():.2f}\n"

        data_summary += f"\nSample data:\n{results_df.head(3).to_string()}\n"

        if llm:
            try:
                gemini_rate_limiter.wait_if_needed()
                prompt = f"""Analyze these query results and provide a clear explanation in 2-3 sentences.

USER QUESTION: {user_question}

DATA SUMMARY:
{data_summary}

Provide natural language explanation:"""

                response = llm.invoke(prompt)
                explanation = response.content.strip().replace("```", "").strip()
                return explanation
            except Exception:
                pass

        return f"Query returned {row_count} record{'s' if row_count > 1 else ''}."
    except Exception as e:
        logger.error(f"Error generating explanation: {str(e)}")
        return f"Query returned {len(results_df)} records."


def clean_column_names(headers):
    cleaned_headers = []
    seen_headers = {}

    for header in headers:
        if pd.isna(header) or str(header).strip() == "":
            header = "Unnamed_Column"
        else:
            header = str(header).strip()
            header = re.sub(r"[^\w\s]", "_", header)
            header = re.sub(r"\s+", "_", header)

        base_header = header
        counter = 1
        while header in seen_headers:
            header = f"{base_header}_{counter}"
            counter += 1

        seen_headers[header] = True
        cleaned_headers.append(header)

    return cleaned_headers


def restructure_excel_sheet(uploaded_file):
    try:
        file_bytes = uploaded_file.read()
        excel_bytes = io.BytesIO(file_bytes)
        cleaned_dfs = {}

        if uploaded_file.name.endswith((".xlsx", ".xls")):
            excel_file = pd.ExcelFile(excel_bytes)
            sheets = excel_file.sheet_names

            for sheet in sheets:
                df = pd.read_excel(excel_bytes, sheet_name=sheet, header=None)
                if df.empty:
                    continue

                clean_sheet_name = re.sub(r"[^\w\s]", "_", sheet)
                clean_sheet_name = re.sub(r"\s+", "_", clean_sheet_name)

                table_sections = find_tables_in_dataframe(
                    df, sheet_name=clean_sheet_name
                )

                for table_info in table_sections:
                    processed_df = process_single_table(df, table_info)
                    if processed_df is not None and not processed_df.empty:
                        table_name = table_info["name"].lower()
                        cleaned_dfs[table_name] = processed_df

        elif uploaded_file.name.endswith(".csv"):
            df = pd.read_csv(io.StringIO(file_bytes.decode("utf-8")), header=None)
            if not df.empty:
                csv_name = os.path.splitext(uploaded_file.name)[0]
                clean_csv_name = re.sub(r"[^\w\s]", "_", csv_name)
                clean_csv_name = re.sub(r"\s+", "_", clean_csv_name)

                table_sections = find_tables_in_dataframe(df, sheet_name=clean_csv_name)

                for table_info in table_sections:
                    processed_df = process_single_table(df, table_info)
                    if processed_df is not None and not processed_df.empty:
                        table_name = table_info["name"].lower()
                        cleaned_dfs[table_name] = processed_df

        return cleaned_dfs if cleaned_dfs else None
    except Exception as e:
        logger.error(f"Error processing file: {str(e)}")
        return None
    finally:
        uploaded_file.seek(0)


def find_tables_in_dataframe(df, sheet_name="default"):
    tables = []
    current_table = None
    i = 0
    table_counter = 1

    while i < len(df):
        row = df.iloc[i]

        if row.isna().all():
            if current_table is not None:
                tables.append(current_table)
                current_table = None
            i += 1
            continue

        if is_table_name_row(row):
            original_table_name = str(row.dropna().iloc[0]).strip()
            if original_table_name and isinstance(original_table_name, str):
                table_name = f"{sheet_name}_{original_table_name}"
            else:
                table_name = f"{sheet_name}_table_{table_counter}"
                table_counter += 1

            table_name = re.sub(r"[^\w\s]", "_", table_name)
            table_name = re.sub(r"\s+", "_", table_name)

            header_idx = None
            data_start_idx = None

            for j in range(i + 1, len(df)):
                next_row = df.iloc[j]
                if next_row.isna().all():
                    break
                if header_idx is None and is_header_row(next_row):
                    header_idx = j
                    data_start_idx = j + 1
                    break

            if header_idx is not None:
                if current_table is not None:
                    tables.append(current_table)

                current_table = {
                    "name": table_name,
                    "start": header_idx,
                    "data_start": data_start_idx,
                    "header_row": header_idx,
                    "end": None,
                }
                i = data_start_idx
                continue

        if current_table is None and is_header_row(row):
            table_name = f"{sheet_name}_table_{table_counter}"
            table_name = re.sub(r"[^\w\s]", "_", table_name)
            table_name = re.sub(r"\s+", "_", table_name)

            current_table = {
                "name": table_name,
                "start": i,
                "data_start": i + 1,
                "header_row": i,
                "end": None,
            }
            table_counter += 1
            i += 1
            continue

        if current_table is not None:
            current_table["end"] = i + 1

        i += 1

    if current_table is not None:
        tables.append(current_table)

    return tables


def is_table_name_row(row):
    non_empty_values = row.dropna()
    return len(non_empty_values) == 1


def is_header_row(row):
    non_empty_values = row.dropna()
    return len(non_empty_values) > 1


def process_single_table(df, table_info):
    try:
        headers = df.iloc[table_info["header_row"]].tolist()
        cleaned_headers = clean_column_names(headers)

        start_idx = table_info["data_start"]
        end_idx = table_info["end"]
        data_df = df.iloc[start_idx:end_idx].copy()

        result_df = pd.DataFrame(data_df.values, columns=cleaned_headers)
        result_df = result_df.dropna(how="all").dropna(axis=1, how="all")

        return result_df if not result_df.empty else None
    except Exception as e:
        logger.error(f"Error processing table: {str(e)}")
        return None


def sanitize_dataframe_for_json(df):
    if df is None or df.empty:
        return df
    df = df.replace([np.nan, np.inf, -np.inf], None)
    for col in df.columns:
        if df[col].dtype in ["float64", "float32", "float16"]:
            df[col] = df[col].apply(
                lambda x: None
                if (x is not None and (np.isnan(x) or np.isinf(x)))
                else x
            )
    return df


def clear_uploaded_data_tables(engine):
    """Clear ONLY tables in uploads schema"""
    try:
        with engine.connect() as conn:
            # Create uploads schema if doesn't exist
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS uploads;"))
            conn.execute(text("SET session_replication_role = 'replica';"))

            # Get tables ONLY from uploads schema
            table_names_query = """
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'uploads' 
                AND table_type = 'BASE TABLE';
            """
            result = conn.execute(text(table_names_query))
            tables = [row[0] for row in result]

            # Drop each table in uploads schema
            for table in tables:
                conn.execute(text(f'DROP TABLE IF EXISTS uploads."{table}" CASCADE;'))

            conn.execute(text("SET session_replication_role = 'origin';"))
            conn.commit()

            logger.info(f"Cleared {len(tables)} table(s) from uploads schema")
    except Exception as e:
        logger.error(f"Error clearing uploads schema: {str(e)}")
        raise


# --- API Views ---
class DataAnalysisAPIView(APIView):
    def __init__(self):
        super().__init__()
        self.db_uri = settings.DATABASE_URL
        self.api_key = get_api_key()

    def post(self, request):
        if "file" in request.FILES:
            return self.handle_file_upload(request)
        return self.handle_analysis_query(request)

    def handle_file_upload(self, request):
        try:
            uploaded_file = request.FILES["file"]

            # Create uploads schema and clear old data
            engine = create_engine(self.db_uri)
            try:
                clear_uploaded_data_tables(engine)

                # Process file
                cleaned_dfs = restructure_excel_sheet(uploaded_file)

                if not cleaned_dfs:
                    return Response(
                        {"error": "No valid data found in file"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Save to DB
                with engine.connect() as conn:
                    for table_name, df in cleaned_dfs.items():
                        df.to_sql(
                            table_name,
                            conn,
                            schema="uploads",
                            if_exists="replace",
                            index=False,
                        )

                return Response(
                    {
                        "success": True,
                        "message": "File processed successfully",
                        "tables": list(cleaned_dfs.keys()),
                    }
                )

            finally:
                engine.dispose()

        except Exception as e:
            logger.error(f"Upload error: {str(e)}")
            return Response(
                {"error": f"Upload failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def handle_analysis_query(self, request):
        try:
            user_question = request.data.get("query")
            session_id = request.data.get("session_id", "default")

            if not user_question:
                return Response(
                    {"error": "Please provide a question."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Check if uploads schema has tables
            engine = create_engine(self.db_uri)
            try:
                with engine.connect() as conn:
                    tables_query = """
                        SELECT COUNT(*) FROM information_schema.tables 
                        WHERE table_schema = 'uploads'
                    """
                    result = conn.execute(text(tables_query))
                    table_count = result.scalar()

                    if table_count == 0:
                        return Response(
                            {"error": "No data available. Please upload a file first."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
            finally:
                engine.dispose()

            # Use Conversational SQL Agent
            gemini_rate_limiter.wait_if_needed()

            # Ensure Chat Session exists
            try:
                if not ChatSession.objects.filter(session_id=session_id).exists():
                    ChatSession.objects.create(
                        session_id=session_id,
                        title=user_question[:100],  # Truncate title
                    )
            except Exception as e:
                logger.error(f"Error creating session: {e}")

            try:
                # Create conversational agent with session
                conv_agent = ConversationalSQLAgent(
                    self.db_uri, self.api_key, session_id
                )
                result = conv_agent.query_with_conversation(user_question)
            except Exception as agent_error:
                logger.error(f"Agent error: {str(agent_error)}")
                return Response(
                    {"error": f"Error processing query: {str(agent_error)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            # Handle clarification needed
            if result.get("needs_clarification"):
                # Save to chat history
                try:
                    ChatHistory.objects.create(
                        session_id=session_id,
                        query=user_question,
                        response=result["question"],
                        sql_query="",
                        results_count=0,
                    )
                except Exception as e:
                    logger.warning(f"Could not save chat history: {e}")

                return Response(
                    {
                        "success": True,
                        "needs_clarification": True,
                        "question": result["question"],
                        "explanation": result["question"],
                    }
                )

            if result["success"]:
                if result.get("results") is not None and not result["results"].empty:
                    sanitized_results = sanitize_dataframe_for_json(result["results"])
                    results_dict = sanitized_results.to_dict(orient="records")

                    response_data = {
                        "success": True,
                        "query": result.get("query", ""),
                        "results": results_dict,
                        "explanation": result["explanation"],
                    }

                    # Save to chat history
                    try:
                        ChatHistory.objects.create(
                            session_id=session_id,
                            query=user_question,
                            response=result["explanation"],
                            sql_query=result.get("query", ""),
                            results_count=len(results_dict),
                        )
                    except Exception as e:
                        logger.warning(f"Could not save chat history: {e}")

                    return Response(response_data)
                else:
                    # No results
                    try:
                        ChatHistory.objects.create(
                            session_id=session_id,
                            query=user_question,
                            response=result.get("explanation", "No results found"),
                            sql_query=result.get("query", ""),
                            results_count=0,
                        )
                    except Exception as e:
                        logger.warning(f"Could not save chat history: {e}")

                    return Response(
                        {
                            "success": True,
                            "message": result.get(
                                "explanation", "No results found for your query."
                            ),
                            "query": result.get("query", ""),
                            "results": [],
                            "explanation": result.get(
                                "explanation", "No data matches your criteria."
                            ),
                        }
                    )
            else:
                error_msg = result.get("error", "Unable to process your query.")
                return Response(
                    {"error": error_msg, "query": result.get("query", "")},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except Exception as e:
            logger.error(f"Analysis query handler error: {str(e)}")
            return Response(
                {"error": f"Error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class SaveResultsAPIView(APIView):
    def post(self, request):
        try:
            results_data = request.data.get("results", [])
            if not results_data:
                return Response(
                    {"error": "No results to save"}, status=status.HTTP_400_BAD_REQUEST
                )

            results_df = pd.DataFrame(results_data)
            results_df = sanitize_dataframe_for_json(results_df)

            csv_buffer = StringIO()
            results_df.to_csv(csv_buffer, index=False)
            csv_buffer.seek(0)

            filename = (
                f"query_results_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}.csv"
            )
            response = HttpResponse(csv_buffer.getvalue(), content_type="text/csv")
            response["Content-Disposition"] = f'attachment; filename="{filename}"'

            return response
        except Exception as e:
            return Response(
                {"error": f"Error saving results: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class DataVisualizationAPIView(APIView):
    parser_classes = (JSONParser,)

    def __init__(self):
        super().__init__()
        self.visualization_agent = None
        try:
            self.visualization_agent = VisualizationAgent()
            logger.info("Visualization agent initialized")
        except Exception as e:
            logger.error(f"Error initializing visualization agent: {str(e)}")

    def post(self, request, *args, **kwargs):
        try:
            results_data = request.data.get("results", [])
            question = request.data.get("question", "")

            if not results_data:
                return Response(
                    {"error": "No data provided for visualization"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if len(results_data) > 500:
                results_data = results_data[:500]

            df = pd.DataFrame(results_data)

            if df.empty:
                return Response(
                    {"error": "Empty dataset provided"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            analysis_result = self.visualization_agent.analyze(df, question)

            if not analysis_result["success"]:
                return Response(
                    {
                        "error": analysis_result.get(
                            "error", "Visualization analysis failed"
                        )
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            charts_with_data = []
            for chart_config in analysis_result["charts"][:2]:
                try:
                    chart_data = ChartDataGenerator.prepare_chart_data(df, chart_config)
                    charts_with_data.append({**chart_config, "chartData": chart_data})
                except Exception as e:
                    logger.error(f"Error preparing chart data: {str(e)}")
                    continue

            simplified_summary = {
                "row_count": analysis_result["summary"].get("row_count", 0),
                "column_count": analysis_result["summary"].get("column_count", 0),
                "numeric_columns": analysis_result["summary"].get(
                    "numeric_columns", []
                ),
                "categorical_columns": analysis_result["summary"].get(
                    "categorical_columns", []
                ),
            }

            return Response(
                {
                    "success": True,
                    "summary": simplified_summary,
                    "charts": charts_with_data,
                    "insights": analysis_result["insights"],
                }
            )
        except Exception as e:
            logger.error(f"Error in visualization endpoint: {str(e)}")
            return Response(
                {"error": f"Visualization error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ChatHistoryAPIView(APIView):
    """API to retrieve chat history"""

    def get(self, request):
        try:
            session_id = request.GET.get("session_id", "default")
            limit = int(request.GET.get("limit", 50))

            history = ChatHistory.objects.filter(session_id=session_id).order_by(
                "-created_at"
            )[:limit]

            history_data = [
                {
                    "id": str(item.id),
                    "query": item.query,
                    "response": item.response,
                    "sql_query": item.sql_query,
                    "results_count": item.results_count,
                    "created_at": item.created_at.isoformat(),
                }
                for item in history
            ]

            return Response({"success": True, "history": history_data})
        except Exception as e:
            logger.error(f"Error fetching chat history: {str(e)}")
            return Response(
                {"error": f"Error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# Add new API view for chat history
class ChatHistoryListAPIView(APIView):
    """API to retrieve all chat sessions"""

    def get(self, request):
        try:
            session_id = request.GET.get("session_id", "default")

            # Get all chat history for this session
            history = ChatHistory.objects.filter(session_id=session_id).order_by(
                "-created_at"
            )

            history_data = [
                {
                    "id": str(item.id),
                    "query": item.query,
                    "response": item.response,
                    "sql_query": item.sql_query,
                    "results_count": item.results_count,
                    "created_at": item.created_at.isoformat(),
                    "preview": item.query[:100] + "..."
                    if len(item.query) > 100
                    else item.query,
                }
                for item in history
            ]

            return Response(
                {"success": True, "history": history_data, "count": len(history_data)}
            )
        except Exception as e:
            logger.error(f"Error fetching chat history: {str(e)}")
            return Response(
                {"error": f"Error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ChatHistoryDetailAPIView(APIView):
    """API to get specific chat by ID"""

    def get(self, request, chat_id):
        try:
            chat = ChatHistory.objects.get(id=chat_id)

            return Response(
                {
                    "success": True,
                    "chat": {
                        "id": str(chat.id),
                        "query": chat.query,
                        "response": chat.response,
                        "sql_query": chat.sql_query,
                        "results_count": chat.results_count,
                        "created_at": chat.created_at.isoformat(),
                    },
                }
            )
        except ChatHistory.DoesNotExist:
            return Response(
                {"error": "Chat not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error fetching chat detail: {str(e)}")
            return Response(
                {"error": f"Error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ChatSessionListAPIView(APIView):
    """API to retrieve and manage chat sessions"""

    def get(self, request):
        try:
            sessions = ChatSession.objects.all().order_by("-created_at")
            data = [
                {
                    "id": session.session_id,
                    "title": session.title,
                    "created_at": session.created_at.isoformat(),
                }
                for session in sessions
            ]
            return Response(data)
        except Exception as e:
            logger.error(f"Error fetching sessions: {str(e)}")
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def delete(self, request, session_id):
        try:
            print(f"DEBUG: Attempting to delete session {session_id}")
            session = ChatSession.objects.get(session_id=session_id)
            # Delete related history (if not cascaded by DB, manual delete here safe)
            deleted_count, _ = ChatHistory.objects.filter(
                session_id=session_id
            ).delete()
            print(
                f"DEBUG: Deleted {deleted_count} history items for session {session_id}"
            )
            session.delete()
            print(f"DEBUG: Deleted session {session_id}")
            return Response({"success": True})
        except ChatSession.DoesNotExist:
            print(f"DEBUG: Session {session_id} not found")
            return Response(
                {"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error deleting session: {str(e)}")
            print(f"DEBUG: Error deleting session: {e}")
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ... (End of file)
