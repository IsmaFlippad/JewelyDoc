// sidebars.js
const fs = require('fs');
const path = require('path');

// Fonction pour organiser les docs par catégorie
function getCategorizedSidebar() {
  const docsPath = path.join(__dirname, 'docs');
  const files = fs.readdirSync(docsPath);
  
  const categories = {};

  files.forEach(file => {
    if (file.endsWith('.md') || file.endsWith('.mdx')) {
      const content = fs.readFileSync(path.join(docsPath, file), 'utf8');
      const frontMatter = content.match(/---\n([\s\S]*?)\n---/);
      
      if (frontMatter) {
        const meta = frontMatter[1].split('\n').reduce((acc, line) => {
          const [key, ...value] = line.split(':');
          if (key && value) {
            acc[key.trim()] = value.join(':').trim().replace(/['"]/g, '');
          }
          return acc;
        }, {});

        if (meta.category) {
          if (!categories[meta.category]) {
            categories[meta.category] = [];
          }
          categories[meta.category].push({
            type: 'doc',
            id: file.replace(/\.mdx?$/, ''),
            title: meta.title || file.replace(/\.mdx?$/, ''),
          });
        }
      }
    }
  });

  return Object.entries(categories).map(([category, items]) => ({
    type: 'category',
    label: category,
    items: items.sort((a, b) => a.title.localeCompare(b.title)),
    collapsed: false,
  }));
}

module.exports = {
  tutorialSidebar: getCategorizedSidebar(),
};