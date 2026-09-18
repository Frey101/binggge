import express from 'express';
import pg from 'pg';

const { Pool } = pg;
const app = express();

app.use(express.json());

// Connexion directe avec l'URI PostgreSQL du conteneur
export const db = new Pool({
    connectionString: 'postgresql://postgres:binggge@localhost:5433/binggge',
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
        }));
        res.json(shows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur TVMaze' });
    }
});

// POST /register (diapo 03)
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

// Garde des routes privées : vérifie l'en-tête X-User (diapo 03)
const user = (req, res, next) => {
    req.get('X-User') ?
        next() :
        res.status(401).json({ error: 'non authentifié' });
};

// GET /watchlist protégé par le garde
// GET /watchlist : consultation avec filtre optionnel ?seen=true|false
app.get('/watchlist', user, async(req, res) => {
    const login = req.get('X-User');
    const { seen } = req.query;

    try {
        // 1. Récupérer l'utilisateur
        const userRes = await db.query('SELECT id FROM users WHERE login = $1', [login]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'utilisateur introuvable' });
        }

        const userId = userRes.rows[0].id;

        // 2. Construire la requête selon la présence du paramètre ?seen=
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

// POST /watchlist : ajouter une série à la watchlist de l'utilisateur
app.post('/watchlist', user, async(req, res) => {
    const login = req.get('X-User');
    const { show_id, title } = req.body;

    if (!show_id || !title) {
        return res.status(400).json({ error: 'show_id et title requis' });
    }

    try {
        // 1. Trouver l'id de l'utilisateur
        const userRes = await db.query('SELECT id FROM users WHERE login = $1', [login]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'utilisateur introuvable' });
        }

        const userId = userRes.rows[0].id;

        // 2. Insérer dans la watchlist
        await db.query(
            'INSERT INTO watchlist (user_id, show_id, title) VALUES ($1, $2, $3)', [userId, show_id, title]
        );

        res.status(201).json({ status: 'série ajoutée' });
    } catch (err) {
        res.status(500).json({ error: 'erreur lors de l\'ajout' });
    }
});




const PORT = 3000;
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });
}

export default app;