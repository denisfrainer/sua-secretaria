CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_phone TEXT NOT NULL,
    client_name TEXT NOT NULL,
    service_type TEXT,
    appointment_date DATE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast lookup by date and owner
CREATE INDEX IF NOT EXISTS idx_appointments_owner_date ON public.appointments (owner_id, appointment_date);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Policies for tenant isolation
CREATE POLICY "Owners can view their own appointments" ON public.appointments
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert their own appointments" ON public.appointments
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own appointments" ON public.appointments
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their own appointments" ON public.appointments
    FOR DELETE USING (auth.uid() = owner_id);
