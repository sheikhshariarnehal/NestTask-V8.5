-- Add random seed data for users and tasks
-- This migration creates sample users and tasks for testing and development

-- First, let's get some existing department, batch, and section IDs to use for seeding
DO $$
DECLARE
    dept_cse_id UUID;
    dept_swe_id UUID;
    dept_mct_id UUID;
    batch_ids UUID[];
    section_ids UUID[];
    user_ids UUID[];
    i INTEGER;
    random_dept_id UUID;
    random_batch_id UUID;
    random_section_id UUID;
    random_user_id UUID;
    task_titles TEXT[] := ARRAY[
        'Complete Database Assignment',
        'Prepare for Midterm Exam',
        'Submit Project Proposal',
        'Review Lecture Notes',
        'Group Study Session',
        'Lab Report Submission',
        'Research Paper Draft',
        'Code Review Meeting',
        'System Design Document',
        'Unit Testing Implementation',
        'Bug Fix and Testing',
        'Documentation Update',
        'Presentation Preparation',
        'Algorithm Implementation',
        'Database Optimization',
        'Security Audit Report',
        'Performance Testing',
        'User Interface Design',
        'API Integration',
        'Deployment Planning'
    ];
    task_categories TEXT[] := ARRAY[
        'Assignment',
        'Exam',
        'Project',
        'Study',
        'Lab',
        'Research',
        'Meeting',
        'Documentation',
        'Testing',
        'Design'
    ];
    task_statuses TEXT[] := ARRAY['pending', 'in_progress', 'completed', 'overdue'];
    first_names TEXT[] := ARRAY[
        'Ahmed', 'Fatima', 'Mohammad', 'Aisha', 'Omar', 'Zainab', 'Ali', 'Khadija',
        'Hassan', 'Maryam', 'Ibrahim', 'Amina', 'Yusuf', 'Hafsa', 'Khalid', 'Ruqayyah',
        'Abdullah', 'Safiya', 'Umar', 'Asma', 'Bilal', 'Sumaya', 'Tariq', 'Layla',
        'Hamza', 'Nadia', 'Saad', 'Zahra', 'Rashid', 'Farah', 'Imran', 'Sana',
        'Faisal', 'Huda', 'Nasir', 'Iman', 'Adnan', 'Rania', 'Salman', 'Dina'
    ];
    last_names TEXT[] := ARRAY[
        'Rahman', 'Ahmed', 'Khan', 'Ali', 'Hassan', 'Hussain', 'Shah', 'Malik',
        'Chowdhury', 'Islam', 'Uddin', 'Alam', 'Haque', 'Karim', 'Siddique', 'Bhuiyan',
        'Miah', 'Sheikh', 'Khatun', 'Begum', 'Aktar', 'Sultana', 'Bibi', 'Noor',
        'Sarkar', 'Das', 'Roy', 'Dey', 'Sen', 'Ghosh', 'Pal', 'Saha'
    ];
BEGIN
    -- Get department IDs
    SELECT id INTO dept_cse_id FROM public.departments WHERE name = 'Computer Science and Engineering (CSE)' LIMIT 1;
    SELECT id INTO dept_swe_id FROM public.departments WHERE name = 'Software Engineering (SWE)' LIMIT 1;
    SELECT id INTO dept_mct_id FROM public.departments WHERE name = 'Multimedia and Creative Technology (MCT)' LIMIT 1;
    
    -- Get some batch IDs
    SELECT ARRAY(SELECT id FROM public.batches LIMIT 10) INTO batch_ids;
    
    -- Get some section IDs
    SELECT ARRAY(SELECT id FROM public.sections LIMIT 20) INTO section_ids;
    
    -- Create 50 random users
    FOR i IN 1..50 LOOP
        -- Select random department, batch, and section
        random_dept_id := CASE (random() * 3)::int
            WHEN 0 THEN dept_cse_id
            WHEN 1 THEN dept_swe_id
            ELSE dept_mct_id
        END;
        
        random_batch_id := batch_ids[(random() * (array_length(batch_ids, 1) - 1))::int + 1];
        random_section_id := section_ids[(random() * (array_length(section_ids, 1) - 1))::int + 1];
        
        -- Create auth user first
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            role,
            raw_user_meta_data,
            raw_app_meta_data,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'student' || i || '@diu.edu.bd',
            crypt('Student123!', gen_salt('bf')),
            now(),
            'authenticated',
            jsonb_build_object(
                'name', first_names[(random() * (array_length(first_names, 1) - 1))::int + 1] || ' ' || 
                        last_names[(random() * (array_length(last_names, 1) - 1))::int + 1],
                'phone', '+880' || (1700000000 + (random() * 99999999)::bigint)::text,
                'studentId', 'ST-' || (2020 + (random() * 5)::int)::text || '-' || lpad(i::text, 4, '0'),
                'departmentId', random_dept_id::text,
                'batchId', random_batch_id::text,
                'sectionId', random_section_id::text
            ),
            jsonb_build_object('role', 'user'),
            now(),
            now()
        );
    END LOOP;
    
    -- Get the newly created user IDs
    SELECT ARRAY(SELECT id FROM auth.users WHERE email LIKE 'student%@diu.edu.bd') INTO user_ids;
    
    -- Create 100 random tasks
    FOR i IN 1..100 LOOP
        random_user_id := user_ids[(random() * (array_length(user_ids, 1) - 1))::int + 1];
        
        -- Get the section_id for this user
        SELECT section_id INTO random_section_id 
        FROM public.users 
        WHERE id = random_user_id;
        
        INSERT INTO public.tasks (
            name,
            category,
            due_date,
            description,
            status,
            user_id,
            section_id,
            created_at
        ) VALUES (
            task_titles[(random() * (array_length(task_titles, 1) - 1))::int + 1],
            task_categories[(random() * (array_length(task_categories, 1) - 1))::int + 1],
            (current_date + (random() * 60 - 30)::int)::date, -- Random date within ±30 days
            'This is a sample task description for testing purposes. ' ||
            'It contains detailed information about what needs to be accomplished. ' ||
            'Students should complete this task according to the given requirements.',
            task_statuses[(random() * (array_length(task_statuses, 1) - 1))::int + 1],
            random_user_id,
            random_section_id,
            now() - (random() * interval '30 days')
        );
    END LOOP;
    
    -- Create 5 section admin users
    FOR i IN 1..5 LOOP
        random_section_id := section_ids[(random() * (array_length(section_ids, 1) - 1))::int + 1];

        -- Get the batch_id and department_id for this section
        SELECT b.department_id, s.batch_id
        INTO random_dept_id, random_batch_id
        FROM public.sections s
        JOIN public.batches b ON s.batch_id = b.id
        WHERE s.id = random_section_id;

        -- Create section admin auth user
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            role,
            raw_user_meta_data,
            raw_app_meta_data,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'sectionadmin' || i || '@diu.edu.bd',
            crypt('Admin123!', gen_salt('bf')),
            now(),
            'authenticated',
            jsonb_build_object(
                'name', 'Section Admin ' || i,
                'phone', '+880' || (1800000000 + (random() * 99999999)::bigint)::text,
                'studentId', 'SA-' || (2020 + (random() * 5)::int)::text || '-' || lpad(i::text, 4, '0'),
                'departmentId', random_dept_id::text,
                'batchId', random_batch_id::text,
                'sectionId', random_section_id::text
            ),
            jsonb_build_object('role', 'section_admin'),
            now(),
            now()
        );
    END LOOP;

    -- Create some section tasks (tasks created by section admins for their sections)
    FOR i IN 1..20 LOOP
        -- Get a random section admin
        SELECT u.id, u.section_id
        INTO random_user_id, random_section_id
        FROM public.users u
        WHERE u.role = 'section_admin'
        ORDER BY random()
        LIMIT 1;

        INSERT INTO public.tasks (
            name,
            category,
            due_date,
            description,
            status,
            user_id,
            section_id,
            created_at
        ) VALUES (
            'Section Task: ' || task_titles[(random() * (array_length(task_titles, 1) - 1))::int + 1],
            task_categories[(random() * (array_length(task_categories, 1) - 1))::int + 1],
            (current_date + (random() * 30)::int)::date, -- Future dates for section tasks
            'This is a section-wide task assigned by the section administrator. ' ||
            'All students in this section should complete this task. ' ||
            'Please coordinate with your section admin for any clarifications.',
            'pending', -- Section tasks start as pending
            random_user_id,
            random_section_id,
            now()
        );
    END LOOP;

    RAISE NOTICE 'Successfully created 50 random users, 5 section admins, and 120 random tasks';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating seed data: %', SQLERRM;
END $$;
