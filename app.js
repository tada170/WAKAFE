// Import required modules
const express = require('express');
const mysql = require('mysql2/promise'); // Using mysql2 with promise support
const bodyParser = require('body-parser');
const cors = require('cors');

// Create the Express app
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MySQL connection configuration
const dbConfig = {
    host: 'sql.daniellinda.net',
    user: 'remote',
    password: 'hm3C4iLL+',
    database: 'coffee'
};

// Function to establish MySQL connection
async function createConnection() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected as id ' + connection.threadId);
        return connection;
    } catch (err) {
        console.error('Connection failed: ' + err.stack);
    }
}

// Instantiate the Service class after establishing connection
class Service {
    constructor(conn) {
        this.conn = conn;
        this.tab_people = 'people';
        this.tab_types = 'types';
    }

    async getPeopleList() {
        const [results] = await this.conn.query(`SELECT * FROM ${this.tab_people}`);
        return results;
    }

    async getTypesList() {
        const [results] = await this.conn.query(`SELECT * FROM ${this.tab_types}`);
        return results;
    }

    async saveDrinks(drinks) {
        const userID = drinks.user[0];
        let res = 0;

        for (const [index, type] of drinks.type.entries()) {
            if (type === 0) continue;
            const row = [new Date().toISOString().slice(0, 10), userID, index + 1];

            try {
                await this.conn.query('INSERT INTO drinks (date, id_people, id_types) VALUES (?, ?, ?)', row);
                res++;
            } catch (error) {
                console.error(error);
            }
        }

        return res === 0 ? -1 : 1;
    }

    async getSummaryOfDrinks(data) {
        const month = data.month ? data.month : 0;
    
        // Define the SQL query
        let sql = `
            SELECT types.typ, COUNT(drinks.ID) AS pocet, people.name
            FROM drinks
            JOIN types ON drinks.id_types = types.ID
            JOIN people ON drinks.id_people = people.ID
        `;
    
        // Add month filtering if specified
        if (month > 0 && month < 13) {
            sql += ` WHERE MONTH(drinks.date) = ${month}`;
        }
    
        sql += `
            GROUP BY types.typ, people.name
            ORDER BY people.name
        `;
    
        try {
            // Execute the query
            const [results] = await this.conn.query(sql);
            
            // Format results to match the expected output for the frontend
            const formattedResults = results.map(result => [result.typ, result.pocet, result.name]);
            
            return formattedResults;
        } catch (error) {
            console.error('Chyba při získávání shrnutí nápojů:', error);
            throw new Error('Chyba při získávání shrnutí nápojů');
        }
    }
    
    
    
}

// Start the server and initialize the connection
async function startServer() {
    const connection = await createConnection();
    const service = new Service(connection);

    // API routes
    app.get('/getPeopleList', async (req, res) => {
        try {
            const results = await service.getPeopleList();
            res.json(results);
        } catch (error) {
            res.status(500).json({ msg: error });
        }
    });

    app.get('/getTypesList', async (req, res) => {
        try {
            const results = await service.getTypesList();
            res.json(results);
        } catch (error) {
            res.status(500).json({ msg: error });
        }
    });

    app.post('/saveDrinks', async (req, res) => {
        try {
            const result = await service.saveDrinks(req.body);
            res.json({ msg: result });
        } catch (error) {
            res.status(500).json({ msg: error });
        }
    });

    app.get('/getSummaryOfDrinks', async (req, res) => {
        try {
            const results = await service.getSummaryOfDrinks(req.query);
            res.json(results);
        } catch (error) {
            res.status(500).json({ msg: error });
        }
    });

    // Start the server
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}

// Run the server
startServer();
