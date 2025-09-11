import express from 'express';
import pg from 'pg';
import { Connector } from '@google-cloud/cloud-sql-connector';
import { env } from 'node:process';

const { Pool } = pg;
const app = express();
const port = parseInt(env.PORT) || 8080;

// Environment variables for Cloud SQL and PostgreSQL credentials.
const instanceConnectionName = env.INSTANCE_CONNECTION_NAME;
const dbUser = env.DB_USER;
const dbName = env.DB_NAME;

// Check for required environment variables.
if (!instanceConnectionName || !dbUser || !dbName) {
  console.error('Missing required environment variables. Please set: INSTANCE_CONNECTION_NAME, DB_USER, DB_NAME.');
  process.exit(1);
}

// Wrap the startup logic in an async function.
const startServer = async () => {
  let pool;
  try {
    // Initialize the Cloud SQL connector.
    const connector = new Connector();
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

    // Ensure the 'visits' table exists before starting the server.
    await pool.query(`CREATE TABLE IF NOT EXISTS visits (
      id SERIAL NOT NULL,
      created_at timestamp NOT NULL,
      PRIMARY KEY (id)
    );`);
    console.log('Database table is ready.');

  } catch (err) {
    console.error('Failed to initialize database connection or create table:', err);
    process.exit(1);
  }

  // --- Define Routes ---

  app.get('/', async (req, res) => {
    let visits = [];
    try {
      const { rows } = await pool.query(`
        SELECT TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI:SS') AS formatted_date
        FROM "public"."visits"
        ORDER BY created_at DESC
        LIMIT 5;
      `);
      visits = rows;
    } catch (err) {
      console.error('Error fetching data from database:', err);
      visits = [{ formatted_date: 'Error fetching data.' }];
    }
  
    // Generate the HTML content dynamically.
    const visitsListHtml = Array.isArray(visits) ? visits.map(visit => `
      <li class="bg-gray-700 p-4 rounded-lg shadow-md mb-2">
        <span class="font-mono text-sm text-gray-300">${visit.formatted_date}</span>
      </li>
    `).join('') : '';
  
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
  
          <div class="text-center mb-6">
            <button
              id="addVisitBtn"
              class="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 transition-colors duration-200 rounded-full font-bold shadow-lg"
            >
              Add New Visit
            </button>
          </div>
  
          <h2 class="text-2xl font-semibold mb-4 text-gray-200">Recent Visits:</h2>
          <ul class="space-y-2">
            ${visitsListHtml}
          </ul>
        </div>
        <script>
          document.addEventListener('DOMContentLoaded', () => {
            const addVisitBtn = document.getElementById('addVisitBtn');
            addVisitBtn.addEventListener('click', async () => {
              addVisitBtn.textContent = 'Adding...';
              addVisitBtn.disabled = true;
              try {
                const response = await fetch('/visits/add', {
                  method: 'POST',
                });
                if (response.ok) {
                  window.location.reload();
                } else {
                  console.error('Failed to add visit.');
                  addVisitBtn.textContent = 'Error!';
                }
              } catch (err) {
                console.error('Failed to add visit:', err);
                addVisitBtn.textContent = 'Error!';
              }
            });
          });
        </script>
      </body>
      </html>
    `;
  
    res.send(html);
  });

  app.post('/visits/add', async (req, res) => {
    try {
      await pool.query('INSERT INTO visits(created_at) VALUES(NOW())');
      res.status(200).send('Visit added successfully.');
    } catch (err) {
      console.error('Error inserting data into database:', err);
      res.status(500).send('Error inserting data.');
    }
  });

  // Start the server.
  app.listen(port, () => {
    console.log(`helloworld: listening on port ${port}`);
  });
};

// Call the async function to start the application.
startServer();