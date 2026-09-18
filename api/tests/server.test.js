import { test, before, after } from 'node:test';
import assert from 'node:assert';
import app, { db } from '../src/server.js';

let server;
const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

before(async() => {
    server = app.listen(PORT);
});

after(async() => {
    await new Promise(resolve => server.close(resolve));
    await db.end();
});

// Test 1 : Inscription puis connexion (création utilisateur)
test('inscription puis verification', async() => {
    const login = `testuser_${Date.now()}`;
    const res = await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login }),
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.status, 'utilisateur créé');
});

// Test 2 : Watchlist sans en-tête -> 401
test('watchlist sans en-tête : 401', async() => {
    const res = await fetch(`${BASE_URL}/watchlist`);
    assert.strictEqual(res.status, 401);
});

// Test 3 : Ajout d'une série valide à la watchlist
test('ajout d une serie valide a la watchlist', async() => {
    const login = `testuser_${Date.now()}`;
    await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login }),
    });

    const res = await fetch(`${BASE_URL}/watchlist`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-User': login,
        },
        body: JSON.stringify({ show_id: 139, title: 'Girls' }),
    });
    assert.strictEqual(res.status, 201);
});

// Test 4 (Défi) : Un titre vide est refusé (doit renvoyer 400)
test('un titre vide est refusé', async() => {
    const login = `testuser_${Date.now()}`;
    await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login }),
    });

    const res = await fetch(`${BASE_URL}/watchlist`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-User': login,
        },
        body: JSON.stringify({ show_id: 139, title: '   ' }), // Espaces -> titre vide
    });
    assert.strictEqual(res.status, 400);
});