-- RESET ADMIN PASSWORD TO: admin123
UPDATE public.users 
SET password = '$2a$10$7R9r2jC61uGvGv58uG9K6.K9uG/89tD.tG/89tD.tG/89tD.tG/89tD.' 
WHERE login = 'admin';
