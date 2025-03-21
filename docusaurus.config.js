// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer').themes.github;
const darkCodeTheme = require('prism-react-renderer').themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Jewely Documentation",
  tagline: "Documentation powered by WordPress and Docusaurus",
  favicon: "img/favicon.ico",

  // Set the production url of your site here
  url: "https://v0-docusaurus-setup.vercel.app/",
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "IsmaFLippad", // Usually your GitHub org/user name.
  projectName: "JewelyDoc", // Usually your repo name.

  onBrokenLinks: "warn", // More forgiving than 'throw'
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang.
  i18n: {
    defaultLocale: "fr",
    locales: ["fr"],
  },

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          // Important: Configure the path to look for WordPress-generated markdown files
          path: "docs",
          routeBasePath: "/",
        },
        blog: false, // Disable the blog plugin
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: "img/jewely-social-card.jpg",
      navbar: {
        title: "Jewely Docs",
        logo: {
          alt: "Jewely Logo",
          src: "img/logo.svg",
        },
        items: [
          {
            type: "docSidebar",
            sidebarId: "tutorialSidebar",
            position: "left",
            label: "Documentation",
          },
          {
            href: "https://www.jewely.fr",
            label: "Site Principal",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Docs",
            items: [
              {
                label: "Documentation",
                to: "/",
              },
            ],
          },
          {
            title: "Jewely",
            items: [
              {
                label: "Site Web",
                href: "https://www.jewely.fr",
              },
              {
                label: "Contact",
                href: "https://www.jewely.fr/contact",
              },
            ],
          },
        ],
        copyright: `Copyright © 2025 Jewely Documentation. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
}

module.exports = config

