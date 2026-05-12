const express = require('express');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const app = express();
const PORT = 4000;

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

// ============= FAVICON FIX =============
// Prevent crashes on favicon requests
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/favicon.png', (req, res) => res.status(204).end());
app.get('/favicon.svg', (req, res) => res.status(204).end());

app.use('/', express.static(path.join(__dirname, 'web')));

app.get('/', limiter, (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'portal.html'));
});

app.get('/settings.json', limiter, (req, res) => {
  res.sendFile(path.join(__dirname, 'settings.json'));
});

const settingsPath = path.join(__dirname, 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

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
let totalRoutes = 0;
const apiModules = [];
const apiUsageStats = new Map();

const loadModules = (dir) => {
  fs.readdirSync(dir).forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      loadModules(filePath);
    } else if (fs.statSync(filePath).isFile() && path.extname(file) === '.js') {
      try {
        const module = require(filePath);
        if (!module.meta || !module.onStart || typeof module.onStart !== 'function') {
          console.warn(chalk.bgHex('#FF9999').hex('#333').bold(`Invalid module in ${filePath}: Missing or invalid meta/onStart`));
          return;
        }
        
        const basePath = module.meta.path.split('?')[0];
        const routePath = '/api' + basePath;
        const method = (module.meta.method || 'get').toLowerCase();
        app[method](routePath, limiter, (req, res) => {
          console.log(chalk.bgHex('#99FF99').hex('#333').bold(`Handling ${method.toUpperCase()} request for ${routePath}`));
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
        console.log(chalk.bgHex('#FFFF99').hex('#333').bold(`Loaded Route: ${module.meta.name} (${method.toUpperCase()})`));
      } catch (error) {
        console.error(chalk.bgHex('#FF9999').hex('#333').bold(`Error loading module ${filePath}: ${error.message}`));
      }
    }
  });
};

loadModules(apiFolder);

console.log(chalk.bgHex('#90EE90').hex('#333').bold('Load Complete! ✓'));
console.log(chalk.bgHex('#90EE90').hex('#333').bold(`Total Routes Loaded: ${totalRoutes}`));

app.get('/api/rankings', (req, res) => {
  const rankings = Array.from(apiUsageStats.entries())
    .map(([key, count]) => {
      const [name, method] = key.split('-');
      return { name, method, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  res.json({ status: true, rankings });
});

app.get('/api/info', limiter, (req, res) => {
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
});

app.get('/docs', limiter, (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'docs.html'));
});

// ============= 404 Handler Update =============
app.use((req, res) => {
  // Don't log favicon 404s
  if (req.url === '/favicon.ico' || req.url === '/favicon.png' || req.url === '/favicon.svg') {
    return res.status(204).end();
  }
  res.status(404).sendFile(path.join(__dirname, 'web', '404.html'));
});

app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).sendFile(path.join(__dirname, 'web', '500.html'));
});

app.listen(PORT, () => {
  console.log(chalk.bgHex('#90EE90').hex('#333').bold(`Server is running on port ${PORT}`));
});

module.exports = app;
