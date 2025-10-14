-- Migration pour ajouter le champ processedAt
ALTER TABLE events ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Index pour optimiser les requêtes
CREATE INDEX idx_events_processed_at ON events(processed_at);

