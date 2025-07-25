// sidebars.js
const fs   = require('fs');
const path = require('path');
const matter = require('gray-matter');

function getCategorizedSidebar() {
  const docsPath = path.join(__dirname, 'docs');
  const files    = fs.readdirSync(docsPath);
  const categories = {};

  files.forEach(file => {
    if (!file.match(/\.mdx?$/)) return;
    const src  = fs.readFileSync(path.join(docsPath, file), 'utf8');
    const { data } = matter(src);

    // data.categories est déjà un tableau de slugs
    (data.categories || []).forEach(cat => {
      categories[cat] = categories[cat] || [];
      categories[cat].push({
        type: 'doc',
        id:   file.replace(/\.mdx?$/, ''),
        label: data.title || file.replace(/\.mdx?$/, ''),
      });
    });
  });

  return Object.entries(categories).map(([cat, items]) => ({
    type: 'category',
    label: cat.charAt(0).toUpperCase() + cat.slice(1),
    items: items.sort((a, b) => a.label.localeCompare(b.label)).map(i => i.id),
    collapsed: false,
  }));
}

module.exports = {
  tutorialSidebar: getCategorizedSidebar(),
};
