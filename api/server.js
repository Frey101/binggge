const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

// 1. Health 
app.get('/health', (req, res) => {
    res.json({ status: "ok" });
});

// 2. renvoie une liste allégée : identifiant, titre,
année, image.
app.get('/shows', async(req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Paramètre 'q' requis" });

    try {
        const response = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        // Filtrage strict des données
        const shows = data.map(item => ({
            id: item.show.id,
            title: item.show.name,
            year: item.show.premiered ? item.show.premiered.slice(0, 4) : null,
            image: item.show.image ? item.show.image.medium : null
        }));

        res.json(shows);
    } catch (err) {
        res.status(500).json({ error: "Erreur lors de la récupération des séries" });
    }
});

// 3. Watchlist Renvoie un tableau vide. 
app.get('/watchlist', (req, res) => {
    res.json([]);
});

app.listen(PORT, () => {
    console.log(`API en écoute sur http://localhost:${PORT}`);
});