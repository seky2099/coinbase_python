const request = require('supertest');
const app = require('../index'); // Assumes app is exported from index.js
const assert = require('assert');

describe('API Endpoints', function() {
    it('should return 200 for the homepage', function(done) {
        request(app)
            .get('/')
            .expect(200, done);
    });

    it('should return a valid response for /api/ad', function(done) {
        request(app)
            .get('/api/ad')
            .end(function(err, res) {
                assert(res.statusCode === 200 || res.statusCode === 404);
                done();
            });
    });
});
