-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE sport_type AS ENUM (
  'football', 'basketball', 'tennis', 'padel', 'running',
  'fitness', 'swimming', 'volleyball', 'other'
);

CREATE TYPE event_level AS ENUM ('beginner', 'intermediate', 'advanced', 'all');

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  birth_date DATE,
  region VARCHAR(100),
  phone_number VARCHAR(20),
  favorite_sports sport_type[] DEFAULT '{}',
  rating_average DECIMAL(3,2) DEFAULT 0.00 CHECK (rating_average >= 0 AND rating_average <= 5),
  rating_count INTEGER DEFAULT 0 CHECK (rating_count >= 0),
  stats JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  device_tokens TEXT[] DEFAULT '{}',
  profile_picture_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  sport sport_type NOT NULL,
  location_name VARCHAR(200) NOT NULL,
  location_address TEXT NOT NULL,
  location_city VARCHAR(100) NOT NULL,
  location_country VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL CHECK (duration > 0), -- in minutes
  total_slots INTEGER NOT NULL CHECK (total_slots > 0),
  available_slots INTEGER NOT NULL CHECK (available_slots >= 0),
  organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organizer_slots INTEGER DEFAULT 1 CHECK (organizer_slots > 0),
  description TEXT,
  price DECIMAL(10, 2) CHECK (price >= 0),
  levels event_level[] DEFAULT '{all}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contraintes corrigées
  CONSTRAINT valid_slots CHECK (available_slots <= total_slots),
  CONSTRAINT valid_organizer_slots CHECK (organizer_slots <= total_slots),
  CONSTRAINT available_slots_logic CHECK (available_slots <= (total_slots - organizer_slots)),
  CONSTRAINT future_events CHECK (date_time > NOW())
);

-- Participants table
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guests INTEGER DEFAULT 0 CHECK (guests >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, event_id)
);

-- Pending participants table (optionnelle selon votre choix)
CREATE TABLE pending_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guests INTEGER DEFAULT 0 CHECK (guests >= 0),
  comment TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, event_id)
);

-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  last_message_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(event_id)
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_events_sport ON events(sport);
CREATE INDEX idx_events_city ON events(location_city);
CREATE INDEX idx_events_date ON events(date_time);
CREATE INDEX idx_events_location ON events(latitude, longitude);
CREATE INDEX idx_participants_user ON participants(user_id);
CREATE INDEX idx_participants_event ON participants(event_id);
CREATE INDEX idx_pending_participants_user ON pending_participants(user_id);
CREATE INDEX idx_pending_participants_event ON pending_participants(event_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- FONCTION CORRIGÉE : Initialisation correcte des available_slots
CREATE OR REPLACE FUNCTION initialize_event_slots()
RETURNS TRIGGER AS $$
BEGIN
    -- Initialiser available_slots = total_slots - organizer_slots
    NEW.available_slots = NEW.total_slots - NEW.organizer_slots;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER initialize_event_slots_trigger
    BEFORE INSERT ON events
    FOR EACH ROW EXECUTE FUNCTION initialize_event_slots();

-- Create function to update available_slots when participants change
CREATE OR REPLACE FUNCTION update_event_slots()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE events 
        SET available_slots = available_slots - (1 + NEW.guests),
            updated_at = NOW()
        WHERE id = NEW.event_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE events 
        SET available_slots = available_slots + (1 + OLD.guests),
            updated_at = NOW()
        WHERE id = OLD.event_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_event_slots_on_participant_change
    AFTER INSERT OR DELETE ON participants
    FOR EACH ROW EXECUTE FUNCTION update_event_slots();

-- Create function to update last_message_id in conversations
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET last_message_id = NEW.id,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_last_message_trigger
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can read all users but only update their own profile
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Events policies
CREATE POLICY "Anyone can view events" ON events FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create events" ON events FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = organizer_id);
CREATE POLICY "Organizers can update their events" ON events FOR UPDATE USING (auth.uid() = organizer_id);
CREATE POLICY "Organizers can delete their events" ON events FOR DELETE USING (auth.uid() = organizer_id);

-- Participants policies
CREATE POLICY "Users can view participants" ON participants FOR SELECT USING (true);
CREATE POLICY "Users can join events" ON participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave events" ON participants FOR DELETE USING (auth.uid() = user_id);

-- Pending participants policies
CREATE POLICY "Users can view pending participants" ON pending_participants FOR SELECT USING (true);
CREATE POLICY "Users can request to join events" ON pending_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can cancel their requests" ON pending_participants FOR DELETE USING (auth.uid() = user_id);

-- POLITIQUES CORRIGÉES : Conversations
CREATE POLICY "Event participants can view conversations" ON conversations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM participants 
    WHERE participants.event_id = conversations.event_id 
    AND participants.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = conversations.event_id 
    AND events.organizer_id = auth.uid()
  )
);

-- POLITIQUES CORRIGÉES : Messages
CREATE POLICY "Conversation participants can view messages" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM participants p
    JOIN conversations c ON c.event_id = p.event_id
    WHERE c.id = messages.conversation_id 
    AND p.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM events e
    JOIN conversations c ON c.event_id = e.id
    WHERE c.id = messages.conversation_id 
    AND e.organizer_id = auth.uid()
  )
);

CREATE POLICY "Conversation participants can send messages" ON messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM participants p
    JOIN conversations c ON c.event_id = p.event_id
    WHERE c.id = conversation_id 
    AND p.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM events e
    JOIN conversations c ON c.event_id = e.id
    WHERE c.id = conversation_id 
    AND e.organizer_id = auth.uid()
  )
);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);