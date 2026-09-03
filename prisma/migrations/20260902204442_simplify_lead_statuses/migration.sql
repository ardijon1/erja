UPDATE Lead SET status = 'follow_up' WHERE status IN ('contacted', 'no_answer', 'awaiting_docs');
UPDATE Lead SET status = 'lost' WHERE status = 'closed';
