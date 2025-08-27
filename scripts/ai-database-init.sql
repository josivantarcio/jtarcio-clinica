-- AI Integration Database Initialization Script
-- Creates required tables and indexes for WhatsApp AI integration

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create N8N database if not exists
CREATE DATABASE n8n_db;

-- Switch to main clinic database
\c eo_clinica_db;

-- WhatsApp conversations table for context management
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id SERIAL PRIMARY KEY,
  conversation_id VARCHAR(255) UNIQUE NOT NULL,
  whatsapp_id VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  user_name VARCHAR(255),
  conversation_context JSONB DEFAULT '{}',
  current_state VARCHAR(50) DEFAULT 'idle', -- idle, waiting_response, booking_appointment, escalated
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active', -- active, closed, blocked
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI message logs for auditing and learning
CREATE TABLE IF NOT EXISTS ai_message_logs (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  message_type VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system', 'voice'
  content TEXT NOT NULL,
  original_audio_url TEXT, -- for voice messages
  transcription_confidence DECIMAL(3,2), -- 0.00 to 1.00
  tokens_used INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  gemini_model VARCHAR(100),
  ai_confidence DECIMAL(3,2), -- AI confidence in response
  urgency_detected BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointment automation logs for tracking booking attempts
CREATE TABLE IF NOT EXISTS appointment_automation_logs (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  user_id VARCHAR(255), -- CUID from users table if user identified
  action_type VARCHAR(50) NOT NULL, -- 'symptom_analysis', 'specialty_recommendation', 'booking_attempt', 'reminder_sent'
  input_data JSONB NOT NULL,
  output_data JSONB,
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Context memory for maintaining conversation state
CREATE TABLE IF NOT EXISTS conversation_context (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  context_key VARCHAR(100) NOT NULL, -- 'user_info', 'symptoms', 'appointment_preference', 'last_interaction'
  context_value JSONB NOT NULL,
  expires_at TIMESTAMP, -- for temporary context like session data
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(conversation_id, context_key)
);

-- N8N workflow execution logs
CREATE TABLE IF NOT EXISTS n8n_execution_logs (
  id SERIAL PRIMARY KEY,
  workflow_id VARCHAR(255) NOT NULL,
  execution_id VARCHAR(255) UNIQUE NOT NULL,
  conversation_id INTEGER REFERENCES whatsapp_conversations(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL, -- 'success', 'error', 'running', 'waiting'
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  input_data JSONB,
  output_data JSONB,
  error_details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI analytics and metrics
CREATE TABLE IF NOT EXISTS ai_analytics_daily (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  total_messages INTEGER DEFAULT 0,
  voice_messages INTEGER DEFAULT 0,
  text_messages INTEGER DEFAULT 0,
  successful_bookings INTEGER DEFAULT 0,
  failed_bookings INTEGER DEFAULT 0,
  escalations INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT 0,
  avg_user_satisfaction DECIMAL(3,2), -- based on feedback
  total_tokens_used INTEGER DEFAULT 0,
  cost_estimate DECIMAL(10,4) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date)
);

-- User feedback for AI responses
CREATE TABLE IF NOT EXISTS ai_feedback (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  message_log_id INTEGER REFERENCES ai_message_logs(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 1-5 stars
  feedback_text TEXT,
  feedback_type VARCHAR(50), -- 'helpful', 'unhelpful', 'inappropriate', 'technical_issue'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON whatsapp_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_status ON whatsapp_conversations(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_state ON whatsapp_conversations(current_state);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_updated ON whatsapp_conversations(updated_at);

CREATE INDEX IF NOT EXISTS idx_ai_message_logs_conversation ON ai_message_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_message_logs_created ON ai_message_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_message_logs_type ON ai_message_logs(message_type);
CREATE INDEX IF NOT EXISTS idx_ai_message_logs_urgency ON ai_message_logs(urgency_detected) WHERE urgency_detected = true;

CREATE INDEX IF NOT EXISTS idx_appointment_logs_conversation ON appointment_automation_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_appointment_logs_user ON appointment_automation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_appointment_logs_action ON appointment_automation_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_appointment_logs_success ON appointment_automation_logs(success);
CREATE INDEX IF NOT EXISTS idx_appointment_logs_created ON appointment_automation_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_conversation_context_conv_key ON conversation_context(conversation_id, context_key);
CREATE INDEX IF NOT EXISTS idx_conversation_context_expires ON conversation_context(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_n8n_execution_workflow ON n8n_execution_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_n8n_execution_status ON n8n_execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_n8n_execution_start ON n8n_execution_logs(start_time);

CREATE INDEX IF NOT EXISTS idx_ai_analytics_date ON ai_analytics_daily(date);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_conversation ON ai_feedback(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_rating ON ai_feedback(rating);

-- Triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_whatsapp_conversations_updated_at 
  BEFORE UPDATE ON whatsapp_conversations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_context_updated_at 
  BEFORE UPDATE ON conversation_context 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired context
CREATE OR REPLACE FUNCTION cleanup_expired_context()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM conversation_context 
  WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to archive old conversations (LGPD compliance)
CREATE OR REPLACE FUNCTION archive_old_conversations(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- Archive conversations older than retention period
  UPDATE whatsapp_conversations 
  SET status = 'archived'
  WHERE status = 'active' 
    AND last_message_at < (CURRENT_TIMESTAMP - INTERVAL '1 day' * retention_days);
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Insert initial AI analytics record for today
INSERT INTO ai_analytics_daily (date) 
VALUES (CURRENT_DATE) 
ON CONFLICT (date) DO NOTHING;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO clinic_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO clinic_user;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'AI Integration database initialization completed successfully!';
  RAISE NOTICE 'Created tables:';
  RAISE NOTICE '- whatsapp_conversations (conversation management)';
  RAISE NOTICE '- ai_message_logs (message auditing)';
  RAISE NOTICE '- appointment_automation_logs (booking tracking)';
  RAISE NOTICE '- conversation_context (state management)';
  RAISE NOTICE '- n8n_execution_logs (workflow tracking)';
  RAISE NOTICE '- ai_analytics_daily (metrics)';
  RAISE NOTICE '- ai_feedback (user satisfaction)';
  RAISE NOTICE 'Created indexes for performance optimization';
  RAISE NOTICE 'Created functions for maintenance and LGPD compliance';
END $$;