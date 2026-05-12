const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

if (!fs.existsSync(path.join(__dirname, 'node_modules', 'express'))) {
  console.log('node_modules missing, running npm install...');
  try {
    execSync('npm install', { stdio: 'inherit', cwd: __dirname });
    console.log('npm install completed');
  } catch(e) {
    console.error('npm install failed:', e.message);
  }
}

const express = require('express');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Global error handlers - MUST be at the very top
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  console.error('Stack:', err.stack);
  // Don't exit, just log
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});

const app = express();
const PORT = process.env.PORT || 8080;

console.log('Starting server...');

app.set("json spaces", 2);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

const limiter = rateLimit({
  windowMs: 1000,
  max: 100,
  handler: (req, res) => {
    res.status(429).json({ status: false, message: "Too many requests" });
  }
});

// Favicon handlers
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/favicon.png', (req, res) => res.status(204).end());

// Static files
app.use('/', express.static(path.join(__dirname, 'web')));

app.get('/', limiter, (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'portal.html'));
});

// Check if settings.json exists
const settingsPath = path.join(__dirname, 'settings.json');
console.log('Looking for settings.json at:', settingsPath);

let settings;
try {
  if (fs.existsSync(settingsPath)) {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    console.log('Settings loaded successfully');
  } else {
    console.error('settings.json NOT FOUND!');
    settings = { apiSettings: { operator: "Created Using Rynn UI" } };
  }
} catch (error) {
  console.error('Error loading settings.json:', error.message);
  settings = { apiSettings: { operator: "Created Using Rynn UI" } };
}

app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(data) {
    if (data && typeof data === 'object') {
      const responseData = {
        status: data.status,
        operator: (settings.apiSettings && settings.apiSettings.operator) || "Created Using Rynn UI",
        ...data
      };
      return originalJson.call(this, responseData);
    }
    return originalJson.call(this, data);
  };
  next();
});

const apiFolder = path.join(__dirname, 'api');
console.log('API folder path:', apiFolder);
console.log('API folder exists:', fs.existsSync(apiFolder));

let totalRoutes = 0;
const apiModules = [];
const apiUsageStats = new Map();

const loadModules = (dir) => {
  if (!fs.existsSync(dir)) {
    console.error(`Directory does not exist: ${dir}`);
    return;
  }
  
  const files = fs.readdirSync(dir);
  console.log(`Found ${files.length} items in ${dir}`);
  
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    try {
      if (fs.statSync(filePath).isDirectory()) {
        loadModules(filePath);
      } else if (fs.statSync(filePath).isFile() && path.extname(file) === '.js') {
        console.log(`Loading module: ${filePath}`);
        const module = require(filePath);
        if (!module.meta || !module.onStart || typeof module.onStart !== 'function') {
          console.warn(`Invalid module in ${filePath}: Missing or invalid meta/onStart`);
          return;
        }
        
        const basePath = module.meta.path.split('?')[0];
        const routePath = '/api' + basePath;
        const method = (module.meta.method || 'get').toLowerCase();
        
        app[method](routePath, limiter, (req, res) => {
          console.log(`Handling ${method.toUpperCase()} request for ${routePath}`);
          const key = `${module.meta.name}-${method}`;
          apiUsageStats.set(key, (apiUsageStats.get(key) || 0) + 1);
          module.onStart({ req, res });
        });
        
        apiModules.push({
          name: module.meta.name,
          category: module.meta.category,
          description: "",
          path: routePath + (module.meta.path.includes('?') ? '?' + module.meta.path.split('?')[1] : ''),
          author: module.meta.author,
          method: module.meta.method || 'get'
        });
        totalRoutes++;
        console.log(`Loaded Route: ${module.meta.name} (${method.toUpperCase()})`);
      }
    } catch (error) {
      console.error(`Error loading module ${filePath}:`, error.message);
      console.error(error.stack);
    }
  });
};

try {
  loadModules(apiFolder);
} catch (error) {
  console.error('Error in loadModules:', error);
}

console.log(`Load Complete! Total Routes Loaded: ${totalRoutes}`);

app.get('/api/rankings', (req, res) => {
  try {
    const rankings = Array.from(apiUsageStats.entries())
      .map(([key, count]) => {
        const [name, method] = key.split('-');
        return { name, method, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    res.json({ status: true, rankings });
  } catch (error) {
    console.error('Rankings error:', error);
    res.status(500).json({ status: false, error: error.message });
  }
});

app.get('/api/info', limiter, (req, res) => {
  try {
    const categories = {};
    apiModules.forEach(module => {
      if (!categories[module.category]) {
        categories[module.category] = { name: module.category, items: [] };
      }
      categories[module.category].items.push({
        name: module.name,
        desc: "",
        path: module.path,
        author: module.author,
        method: module.method
      });
    });
    res.json({ categories: Object.values(categories) });
  } catch (error) {
    console.error('Info error:', error);
    res.status(500).json({ status: false, error: error.message });
  }
});

app.get('/docs', limiter, (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'docs.html'));
});

// 404 handler
app.use((req, res) => {
  if (req.url === '/favicon.ico' || req.url === '/favicon.png') {
    return res.status(204).end();
  }
  res.status(404).sendFile(path.join(__dirname, 'web', '404.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Express Error Handler:', err);
  res.status(500).sendFile(path.join(__dirname, 'web', '500.html'));
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
