import express from 'express';
import pg from 'pg';
import cors from 'cors';

const { Pool } = pg;
const app = express();

app.use(express.json());
app.use(express.static('public')); // Permet de lire index.html et style.css




// 1. Autoriser DELETE dans CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-User']
}));

// Connexion directe avec l'URI PostgreSQL du conteneur
export const db = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:binggge@localhost:5432/binggge',
});

// GET /health
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// GET /shows?q=
app.get('/shows', async(req, res) => {
    const query = req.query.q;
    if (!query) return res.json([]);
    try {
        const response = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        const shows = data.map(item => ({
            id: item.show.id,
            title: item.show.name,
            year: item.show.premiered ? item.show.premiered.split('-')[0] : null,
            image: item.show.image ? item.show.image.medium : null,
            summary: item.show.summary // <-- AJOUTE CETTE LIGNE ICI
        }));
        res.json(shows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur TVMaze' });
    }
});

// POST /register
app.post('/register', async(req, res) => {
    try {
        await db.query(
            'INSERT INTO users (login) VALUES ($1)', [req.body.login]
        );
        res.status(201).json({ status: 'utilisateur créé' });
    } catch (err) {
        res.status(400).json({ error: 'erreur inscription' });
    }
});

// Garde des routes privées : vérifie l'en-tête X-User
const user = (req, res, next) => {
    req.get('X-User') ?
        next() :
        res.status(401).json({ error: 'non authentifié' });
};

// GET /watchlist
app.get('/watchlist', user, async(req, res) => {
    const login = req.get('X-User');
    const { seen } = req.query;

    try {
        const userRes = await db.query('SELECT id FROM users WHERE login = $1', [login]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'utilisateur introuvable' });
        }

        const userId = userRes.rows[0].id;

        let queryText = 'SELECT id, show_id, title, seen FROM watchlist WHERE user_id = $1';
        const queryParams = [userId];

        if (seen !== undefined) {
            queryParams.push(seen === 'true');
            queryText += ' AND seen = $2';
        }

        const result = await db.query(queryText, queryParams);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'erreur lors de la récupération de la watchlist' });
    }
});

// POST /watchlist
app.post('/watchlist', user, async(req, res) => {
    const login = req.get('X-User');
    const { show_id, title } = req.body;

    if (!show_id || !title || (typeof title === 'string' && title.trim() === '')) {
        return res.status(400).json({ error: 'show_id et titre non vide requis' });
    }

    try {
        const userRes = await db.query('SELECT id FROM users WHERE login = $1', [login]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'utilisateur introuvable' });
        }

        const userId = userRes.rows[0].id;

        await db.query(
            'INSERT INTO watchlist (user_id, show_id, title) VALUES ($1, $2, $3)', [userId, show_id, title.trim()]
        );

        res.status(201).json({ status: 'série ajoutée' });
    } catch (err) {
        console.error('Erreur SQL détaillée :', err);
        res.status(500).json({ error: 'erreur lors de l\'ajout' });
    }
});

// DELETE /watchlist/:id (Suppression par show_id ou par id)
app.delete('/watchlist/:id', user, async(req, res) => {
    const login = req.get('X-User');
    const { id } = req.params;

    try {
        const userRes = await db.query('SELECT id FROM users WHERE login = $1', [login]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'utilisateur introuvable' });
        }

        const userId = userRes.rows[0].id;

        // Supprime par clé primaire id ou par show_id pour cet utilisateur
        const result = await db.query(
            'DELETE FROM watchlist WHERE (id::text = $1 OR show_id::text = $1) AND user_id = $2 RETURNING *', [id, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Série non trouvée dans la watchlist' });
        }

        res.status(204).send();
    } catch (err) {
        console.error('Erreur SQL DELETE:', err);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});


// PUT /watchlist/:id/seen : Mettre à jour le statut "vu"
app.put('/watchlist/:id/seen', user, async(req, res) => {
    const login = req.get('X-User');
    const { id } = req.params;
    const { seen } = req.body; // doit être un booléen (true ou false)

    try {
        const userRes = await db.query('SELECT id FROM users WHERE login = $1', [login]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'utilisateur introuvable' });
        }

        const userId = userRes.rows[0].id;

        const result = await db.query(
            'UPDATE watchlist SET seen = $1 WHERE (id::text = $2 OR show_id::text = $2) AND user_id = $3 RETURNING *', [seen, id, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Série non trouvée dans la watchlist' });
        }

        res.json({ status: 'Mise à jour réussie', seen: result.rows[0].seen });
    } catch (err) {
        console.error('Erreur SQL PUT:', err);
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});


const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });
}

export default app;