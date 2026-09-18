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
app.get('/watchlist', user, (req, res) => {
    res.json([]);
});

const PORT = 3000;
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });
}

export default app;