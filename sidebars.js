/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  // By default, Docusaurus generates a sidebar from the docs folder structure
  tutorialSidebar: [
    {
      type: "doc",
      id: "index",
      label: "Accueil",
    },
    {
      type: "doc",
      id: "decouvrir-jewely",
      label: "Découvrir Jewely",
    },
    {
      type: "doc",
      id: "guide-demarrage",
      label: "Guide de démarrage",
    },
    {
      type: "doc",
      id: "fonctionnalites-avancees",
      label: "Fonctionnalités avancées",
    },
    {
      type: "doc",
      id: "faq",
      label: "FAQ",
    },
  ],
}

module.exports = sidebars

