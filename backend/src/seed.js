const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedData() {
  const userId = '23d406ce-ecc0-49d0-8bfa-cdb5e67484cf'; // Obaid Khan

  try {
    console.log('Seeding test data...');
    
    // Create 6 Test Projects
    const projectNames = [
      'Website Redesign 2026',
      'Mobile App Launch',
      'Marketing Campaign Q3',
      'Security Audit Fixes',
      'Customer Portal Update',
      'AI Feature Integration'
    ];
    
    const projectIds = [];
    for (const name of projectNames) {
      const res = await pool.query(
        'INSERT INTO projects (name, description, created_by) VALUES ($1, $2, $3) RETURNING id',
        [name, `This is a test project for ${name}.`, userId]
      );
      projectIds.push(res.rows[0].id);
      
      // Also add user as a member
      await pool.query(
        'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
        [res.rows[0].id, userId, 'admin']
      );
    }
    
    // For the first two projects, let's create boards/columns and assign tasks
    for (let i = 0; i < 2; i++) {
      const projectId = projectIds[i];
      
      // Get the default columns created by the trigger
      const colsRes = await pool.query('SELECT id, name FROM columns WHERE project_id = $1 ORDER BY position', [projectId]);
      let columns = colsRes.rows;
      
      if (columns.length === 0) {
        // Just in case trigger didn't run, create manually
        await pool.query('INSERT INTO columns (project_id, name, position) VALUES ($1, $2, 0)', [projectId, 'To Do']);
        await pool.query('INSERT INTO columns (project_id, name, position) VALUES ($1, $2, 1)', [projectId, 'In Progress']);
        await pool.query('INSERT INTO columns (project_id, name, position) VALUES ($1, $2, 2)', [projectId, 'Done']);
        const cRes = await pool.query('SELECT id, name FROM columns WHERE project_id = $1 ORDER BY position', [projectId]);
        columns = cRes.rows;
      }
      
      const todoId = columns.find(c => c.name === 'To Do')?.id || columns[0].id;
      const progId = columns.find(c => c.name === 'In Progress')?.id || columns[1].id;
      const doneId = columns.find(c => c.name === 'Done')?.id || columns[2].id;

      // Add tasks to To Do
      const t1 = await pool.query(
        'INSERT INTO tasks (project_id, column_id, title, description, priority, assigned_to, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [projectId, todoId, `Design Initial Mockups for ${i}`, 'Need a Figma file', 'high', userId, userId]
      );
      
      // Add tasks to In Progress
      const t2 = await pool.query(
        'INSERT INTO tasks (project_id, column_id, title, description, priority, assigned_to, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [projectId, progId, `Implement API endpoints for ${i}`, 'Backend work', 'medium', userId, userId]
      );

      // Add tasks to Done
      const t3 = await pool.query(
        'INSERT INTO tasks (project_id, column_id, title, description, priority, assigned_to, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [projectId, doneId, `Setup initial repository for ${i}`, 'Github repo created', 'low', userId, userId]
      );

      // Add some comments
      await pool.query(
        'INSERT INTO comments (task_id, user_id, content) VALUES ($1, $2, $3)',
        [t1.rows[0].id, userId, "I'll start working on this right away!"]
      );

      // Add some notifications
      await pool.query(
        'INSERT INTO notifications (user_id, type, content, related_id) VALUES ($1, $2, $3, $4)',
        [userId, 'task_assigned', `You were assigned a new task: Implement API endpoints for ${i}`, t2.rows[0].id]
      );
    }
    
    // Give some unread notifications
    await pool.query(
      'INSERT INTO notifications (user_id, type, content, related_id) VALUES ($1, $2, $3, $4)',
      [userId, 'project_invite', 'You have been added to the Marketing Campaign Q3 project.', projectIds[2]]
    );

    console.log('Seeding complete!');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    pool.end();
  }
}

seedData();
