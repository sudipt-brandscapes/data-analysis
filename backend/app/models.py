# backend/app/models.py
from django.db import models
from django.contrib.auth.models import User
import uuid

class ChatHistory(models.Model):
    """Store all chat conversations"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session_id = models.CharField(max_length=255, db_index=True)
    query = models.TextField()
    response = models.TextField()
    sql_query = models.TextField(blank=True, null=True)
    results_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'chat_history'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.session_id} - {self.query[:50]}"


class UploadedFile(models.Model):
    """Track all uploaded files"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    filename = models.CharField(max_length=255)
    file_size = models.BigIntegerField()
    file_type = models.CharField(max_length=10)
    tables_created = models.JSONField(default=list)
    row_count = models.IntegerField(default=0)
    column_count = models.IntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'uploaded_files'
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.filename} - {self.uploaded_at}"