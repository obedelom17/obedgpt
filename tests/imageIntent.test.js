import { describe, it, expect } from 'vitest'
import { detectImageIntent as d } from '../src/lib/imageIntent.js'

describe('detectImageIntent : demandes d\'image', () => {
  it.each([
    "génère une image d'un garçon au quartier en afrique",
    'Dessine-moi un mouton sur la lune',
    'peux-tu me créer une photo d\'un coucher de soleil à Lomé ?',
    'Generate an image of a red car in the rain',
    "je veux une illustration d'un lion",
    'fais un logo pour mon restaurant de grillades',
    'make a poster for a jazz night',
    'montre-moi une image de la ville de Lomé la nuit',
    'draw a cat wearing a hat',
  ])('%s', t => expect(d(t)).toBeTruthy())
})

describe('detectImageIntent : pas une demande d\'image', () => {
  it.each([
    'analyse cette image',
    'comment générer une image avec python ?',
    'crée une image docker pour mon app node',
    'génère une image',
    'quelle est la meilleure photo de profil ?',
    'écris un poème sur l\'afrique',
    'explique ce dessin technique',
    'génère un tableau excel des ventes',
    'dessine un diagramme de séquence pour le login',
    'crée un logo en svg',
    '/image un chat',
    'bonjour',
  ])('%s', t => expect(d(t)).toBeNull())
})
