-- Fix SMS RLS policy to allow users to see messages where they are sender or recipient
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own SMS messages" ON sms_messages;
DROP POLICY IF EXISTS "Users can insert their own SMS messages" ON sms_messages;
DROP POLICY IF EXISTS "Users can update their own SMS messages" ON sms_messages;
DROP POLICY IF EXISTS "Users can delete their own SMS messages" ON sms_messages;

-- Create new policies that allow users to see messages where they are involved
CREATE POLICY "Users can view SMS messages they are involved in" ON sms_messages
  FOR SELECT USING (
    auth.uid() = user_id OR 
    from_number IN (
      SELECT number FROM phone_number 
      WHERE inbound_assistant_id IN (
        SELECT id FROM assistant WHERE user_id = auth.uid()
      )
    ) OR
    to_number IN (
      SELECT number FROM phone_number 
      WHERE inbound_assistant_id IN (
        SELECT id FROM assistant WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert SMS messages" ON sms_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update SMS messages they are involved in" ON sms_messages
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    from_number IN (
      SELECT number FROM phone_number 
      WHERE inbound_assistant_id IN (
        SELECT id FROM assistant WHERE user_id = auth.uid()
      )
    ) OR
    to_number IN (
      SELECT number FROM phone_number 
      WHERE inbound_assistant_id IN (
        SELECT id FROM assistant WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete SMS messages they are involved in" ON sms_messages
  FOR DELETE USING (
    auth.uid() = user_id OR 
    from_number IN (
      SELECT number FROM phone_number 
      WHERE inbound_assistant_id IN (
        SELECT id FROM assistant WHERE user_id = auth.uid()
      )
    ) OR
    to_number IN (
      SELECT number FROM phone_number 
      WHERE inbound_assistant_id IN (
        SELECT id FROM assistant WHERE user_id = auth.uid()
      )
    )
  );

