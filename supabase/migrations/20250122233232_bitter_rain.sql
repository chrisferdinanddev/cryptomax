/*
  # Bitcoin Investment Platform Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key) - Links to auth.users
      - `username` (text)
      - `btc_balance` (decimal) - Simulated BTC balance
      - `usd_balance` (decimal) - Simulated USD balance
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - References profiles
      - `type` (text) - deposit, withdrawal, trade
      - `amount` (decimal)
      - `currency` (text) - BTC or USD
      - `status` (text) - pending, completed, failed
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for user data access
*/

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  username text UNIQUE,
  btc_balance decimal DEFAULT 0 CHECK (btc_balance >= 0),
  usd_balance decimal DEFAULT 0 CHECK (usd_balance >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  type text CHECK (type IN ('deposit', 'withdrawal', 'trade')),
  amount decimal NOT NULL,
  currency text CHECK (currency IN ('BTC', 'USD')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Transactions policies
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();