-- Enable realtime for communication_sessions table
ALTER TABLE communication_sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE communication_sessions;