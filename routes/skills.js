const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const skillRoutes = (pool) => {
    const router = express.Router();

    // Search skills by term
    router.get('/search', async (req, res) => {
        const { term } = req.query;

        try {
            const result = await pool.query(
                'SELECT * FROM skills WHERE LOWER(name) LIKE $1 OR LOWER(category) LIKE $1',
                [`%${term.toLowerCase()}%`]
            );
            res.json(result.rows);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Get all skills
    router.get('/', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM skills');
            res.json(result.rows);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Get a skill by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;

        try {
            const result = await pool.query('SELECT * FROM skills WHERE skill_id = $1', [id]);
            res.json(result.rows[0]);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Update a skill category
    router.put('/category/:category', async (req, res) => {
        const { category } = req.params;
        const { newCategory, newSkills } = req.body;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Update the category name
            await client.query('UPDATE skills SET category = $1 WHERE category = $2', [newCategory, category]);

            // Update the skill names
            for (const skill of newSkills) {
                if (skill.skill_id) {
                    await client.query('UPDATE skills SET name = $1 WHERE skill_id = $2', [skill.name, skill.skill_id]);
                } else {
                    await client.query('INSERT INTO skills (name, category) VALUES ($1, $2)', [skill.name, newCategory]);
                }
            }

            await client.query('COMMIT');
            res.status(200).json({ message: 'Skill category updated successfully' });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        } finally {
            client.release();
        }
    });

    // Delete a skill by ID
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Delete references to the skill in member_skills table
            await client.query('DELETE FROM member_skills WHERE skill_id = $1', [id]);

            // Delete the skill itself
            const result = await client.query('DELETE FROM skills WHERE skill_id = $1 RETURNING *', [id]);
            if (result.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Skill not found' });
            }

            await client.query('COMMIT');
            res.status(200).json({ message: 'Skill deleted successfully' });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        } finally {
            client.release();
        }
    });

    return router;
};

module.exports = skillRoutes;