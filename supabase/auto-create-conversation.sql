-- ============================================
-- Trigger: Créer automatiquement une conversation lors de la création d'un événement
-- ============================================
-- Ce trigger s'assure que chaque événement a une conversation associée
-- ============================================

-- Créer la fonction qui crée une conversation avec message système
CREATE OR REPLACE FUNCTION create_conversation_for_event()
RETURNS TRIGGER AS $$
DECLARE
  new_conversation_id uuid;
  system_user_id uuid;
BEGIN
  -- Créer une conversation pour le nouvel événement
  INSERT INTO conversations (event_id)
  VALUES (NEW.id)
  ON CONFLICT (event_id) DO NOTHING
  RETURNING id INTO new_conversation_id;
  
  -- Si la conversation vient d'être créée, ajouter un message système
  IF new_conversation_id IS NOT NULL THEN
    -- Utiliser l'ID de l'organisateur comme expéditeur du message système
    system_user_id := NEW.organizer_id;
    
    -- Créer le message système de bienvenue
    INSERT INTO messages (conversation_id, sender_id, content, type, read)
    VALUES (
      new_conversation_id,
      system_user_id,
      'Conversation créée pour l''événement "' || NEW.name || '".',
      'system',
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS auto_create_conversation_on_event ON events;

-- Créer le trigger qui se déclenche après la création d'un événement
CREATE TRIGGER auto_create_conversation_on_event
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION create_conversation_for_event();

-- ============================================
-- Vérification
-- ============================================

-- Vérifier que le trigger est créé
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'auto_create_conversation_on_event';

-- ============================================
-- 🎉 Configuration terminée !
-- ============================================
--
-- Maintenant, chaque fois qu'un événement est créé:
-- 1. Un trigger se déclenche automatiquement
-- 2. Une conversation est créée et liée à l'événement
-- 3. Les participants peuvent commencer à chatter
--
-- Pour tester:
-- 1. Créez un événement via l'app
-- 2. Vérifiez dans Supabase:
--    SELECT e.name, c.id as conversation_id 
--    FROM events e 
--    LEFT JOIN conversations c ON c.event_id = e.id 
--    ORDER BY e.created_at DESC LIMIT 5;
-- ============================================

