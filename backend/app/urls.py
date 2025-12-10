from django.urls import path
from .views import (
    DataAnalysisAPIView,
    SaveResultsAPIView,
    DataVisualizationAPIView,
    ChatHistoryListAPIView,
    ChatHistoryDetailAPIView,
    ChatSessionListAPIView,
)

urlpatterns = [
    path("api/analysis/", DataAnalysisAPIView.as_view(), name="data_analysis"),
    path("api/save-results/", SaveResultsAPIView.as_view(), name="save_results"),
    path(
        "api/visualize/", DataVisualizationAPIView.as_view(), name="data_visualization"
    ),
    path(
        "api/chat-history/", ChatHistoryListAPIView.as_view(), name="chat_history_list"
    ),
    path(
        "api/chat-history/<uuid:chat_id>/",
        ChatHistoryDetailAPIView.as_view(),
        name="chat_history_detail",
    ),
    path(
        "api/chat-sessions/", ChatSessionListAPIView.as_view(), name="chat_session_list"
    ),
    path(
        "api/chat-sessions/<str:session_id>/",
        ChatSessionListAPIView.as_view(),
        name="chat_session_detail",
    ),
]
