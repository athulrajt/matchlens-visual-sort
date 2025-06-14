
-- Enable RLS and define policies for the 'clusters' table
ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own clusters"
ON public.clusters FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clusters"
ON public.clusters FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clusters"
ON public.clusters FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clusters"
ON public.clusters FOR DELETE
USING (auth.uid() = user_id);

-- Enable RLS and define policies for the 'images' table
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own images"
ON public.images FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own images"
ON public.images FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images"
ON public.images FOR DELETE
USING (auth.uid() = user_id);

-- Enable RLS and define policies for the 'profiles' table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
