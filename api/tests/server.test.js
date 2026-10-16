import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app, { db } from '../src/server.js';

// Ferme proprement le pool PostgreSQL à la fin de tous les tests
after(async() => {
    await db.end();
});

// Test 0 : Health check (TP1 / TP2)
test('health répond ok', async() => {
    const res = await request(app).get('/health');
    assert.strictEqual(res.status, 201);
});

// Test 1 : Inscription puis création utilisateur (TP2)
test('inscription puis verification', async() => {
    const login = `testuser_${Date.now()}`;
    const res = await request(app)
        .post('/register')
        .send({ login });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.status, 'utilisateur créé');
});

// Test 2 : Watchlist sans en-tête -> 401 (TP2)
test('watchlist sans en-tête : 401', async() => {
    const res = await request(app).get('/watchlist');
    assert.strictEqual(res.status, 401);
});

// Test 3 : Ajout d'une série valide à la watchlist (TP2)
test('ajout d une serie valide a la watchlist', async() => {
    const login = `testuser_${Date.now()}`;
    await request(app)
        .post('/register')
        .send({ login });

    const res = await request(app)
        .post('/watchlist')
        .set('X-User', login)
        .send({ show_id: 139, title: 'Girls' });

    assert.strictEqual(res.status, 201);
});

// Test 4 (Défi) : Un titre vide est refusé (doit renvoyer 400)
test('un titre vide est refusé', async() => {
    const login = `testuser_${Date.now()}`;
    await request(app)
        .post('/register')
        .send({ login });

    const res = await request(app)
        .post('/watchlist')
        .set('X-User', login)
        .send({ show_id: 139, title: '   ' });

    assert.strictEqual(res.status, 400);
});