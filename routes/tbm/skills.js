const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const skillRoutes = (pool) => {
    const router = express.Router();

    // Fetch all categories
    router.get('/categories', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM categories');
            res.json(result.rows);
        } catch (err) {
            console.error('Error fetching categories:', err.stack);
            res.status(500).json({ error: 'An error occurred while fetching categories.' });
        }
    });

    // Get a skill by ID
    router.get('/:id(\\d+)', async (req, res) => {
        const { id } = req.params;

        try {
            const result = await pool.query(
                'SELECT skills.*, categories.category FROM skills JOIN categories ON skills.category_id = categories.category_id WHERE skill_id = $1',
                [id]
            );
            res.json(result.rows[0]);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred while fetching skill by ID.' });
        }
    });

    // Search skills by term
    router.get('/search', async (req, res) => {
        const { term } = req.query;

        try {
            const result = await pool.query(
                'SELECT skills.*, categories.category FROM skills JOIN categories ON skills.category_id = categories.category_id WHERE LOWER(skills.name) LIKE $1 OR LOWER(categories.category) LIKE $1',
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
            const result = await pool.query('SELECT skills.*, categories.category FROM skills JOIN categories ON skills.category_id = categories.category_id');
            res.json(result.rows);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Get skills for a specific member
    router.get('/members/:memberId/skills', async (req, res) => {
        const { memberId } = req.params;

        try {
            const result = await pool.query(
                'SELECT skills.skill_id, skills.name, categories.category FROM member_skills JOIN skills ON member_skills.skill_id = skills.skill_id JOIN categories ON skills.category_id = categories.category_id WHERE member_skills.user_id = $1',
                [memberId]
            );
            res.json({ skills: result.rows });
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Create a new skill
    router.post('/', async (req, res) => {
        const { name, category_id } = req.body;

        try {
            // Insert the new skill
            const result = await pool.query('INSERT INTO skills (name, category_id) VALUES ($1, $2) RETURNING *', [name, category_id]);
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Error:', err.message);
            res.status(500).json({ error: 'An error occurred. Please try again.' });
        }
    });

    // Create a new category
    router.post('/categories', async (req, res) => {
        const { category } = req.body;

        try {
            const result = await pool.query('INSERT INTO categories (category) VALUES ($1) RETURNING *', [category]);
            res.status(201).json(result.rows[0]);
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
            const categoryResult = await client.query('UPDATE categories SET category = $1 WHERE category = $2 RETURNING category_id', [newCategory, category]);
            const categoryId = categoryResult.rows[0].category_id;

            // Update the skill names
            for (const skill of newSkills) {
                if (skill.skill_id) {
                    await client.query('UPDATE skills SET name = $1, category_id = $2 WHERE skill_id = $3', [skill.name, categoryId, skill.skill_id]);
                } else {
                    await client.query('INSERT INTO skills (name, category_id) VALUES ($1, $2)', [skill.name, categoryId]);
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