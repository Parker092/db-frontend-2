import express from 'express';
import pg from 'pg';
import { Connector } from '@google-cloud/cloud-sql-connector';

const { Pool } = pg;
const app = express();
const port = parseInt(process.env.PORT) || 8080;

// Environment variables for Cloud SQL and PostgreSQL credentials.
const instanceConnectionName = process.env.INSTANCE_CONNECTION_NAME;
const dbUser = process.env.DB_USER;
const dbName = process.env.DB_NAME;

// Check for required environment variables.
if (!instanceConnectionName || !dbUser || !dbName) {
    console.error('Missing required environment variables. Please set: INSTANCE_CONNECTION_NAME, DB_USER, DB_NAME.');
    process.exit(1);
}

// Initialize the Cloud SQL connector.
const connector = new Connector();

let pool;
try {
    const clientOpts = await connector.getOptions({
        instanceConnectionName,
        ipType: 'PRIVATE',
        authType: 'IAM'
    });

    pool = new Pool({
        ...clientOpts,
        user: dbUser,
        database: dbName
    });
    console.log('Successfully connected to Cloud SQL via the Cloud SQL Connector.');

} catch (err) {
    console.error('Failed to get connection options or connect to database:', err);
    // Exit the process if the initial connection fails.
    process.exit(1);
}


// Display all visits.
app.get('/', async (req, res) => {
    let visits = [];
    try {
        // Fetch the last 5 visits.
        const { rows } = await pool.query('SELECT * FROM "public"."visits" ORDER BY created_at DESC LIMIT 5;');
        console.table(rows); // prints the last 5 visits
        visits = rows;
    } catch (err) {
        console.error('Error fetching data from database:', err);
        visits = [{ created_at: 'Error fetching data.' }];
    }

    // Generate the HTML content dynamically.
    const visitsListHtml = Array.isArray(visits) ? visits.map(visit => {
        // Check if the date is a valid object before calling toLocaleString().
        const dateObject = new Date(visit.created_at);
        const formattedDate = isNaN(dateObject) ? 'Invalid Date' : dateObject.toLocaleString();

        return `
<li class="bg-gray-700 p-4 rounded-lg shadow-md mb-2">
<span class="font-mono text-sm text-gray-300">${formattedDate}</span>
</li>
`;
    }).join('') : '';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Cloud SQL PostgreSQL Visits</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
body {
font-family: 'Inter', sans-serif;
}
</style>
</head>
<body class="bg-gray-900 text-white flex items-center justify-center min-h-screen p-4">
<div class="bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-lg w-full">
<h1 class="text-4xl font-bold text-center mb-4 text-emerald-400">Database Visits</h1>
<p class="text-center text-gray-400 mb-6">
<span class="text-xs italic text-gray-500">The page shows the last 5 visits from the database.</span>
</p>

<h2 class="text-2xl font-semibold mb-4 text-gray-200">Recent Visits:</h2>
<ul class="space-y-2">
${visitsListHtml}
</ul>
</div>
</body>
</html>
`;

    res.send(html);
});

// Start the server and create the visits table if it doesn't exist.
app.listen(port, async () => {
    console.log('process.env: ', process.env);
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS visits (
id SERIAL NOT NULL,
created_at timestamp NOT NULL,
PRIMARY KEY (id)
);`);
        console.log(`helloworld: listening on port ${port}`);
    } catch (err) {
        console.error('Error creating table:', err);
        process.exit(1);
    }
});
