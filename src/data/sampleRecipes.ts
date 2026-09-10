import { Recipe } from '../types';

export const initialRecipes: Recipe[] = [
  {
    id: 'receta-pasta-alfredo-ig',
    title: 'Pasta Fettuccine Alfredo Cremosa sin Nata Pesada',
    description: 'Receta viral de Instagram para una pasta Alfredo sedosa usando el agua de cocción y queso Parmigiano Reggiano auténtico.',
    sourceUrl: 'https://www.instagram.com/reel/C3x918LpzKl/',
    sourcePlatform: 'instagram',
    author: '@pasta_artesanal_chef',
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    totalTimeMinutes: 25,
    servings: 2,
    category: 'Almuerzo/Cena',
    difficulty: 'Fácil',
    imageUrl: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800&auto=format&fit=crop&q=80',
    tags: ['Pasta', 'Italiana', 'Fácil', 'Cena Rápida'],
    notes: 'El secreto está en apagar el fuego antes de añadir el queso rallado finamente para que no se corte.',
    createdAt: '2026-09-07T14:30:00.000Z',
    ingredients: [
      { id: 'ing-1', item: 'Fettuccine o Tagliatelle', amount: 250, unit: 'g', checked: false },
      { id: 'ing-2', item: 'Mantequilla sin sal de buena calidad', amount: 50, unit: 'g', checked: false },
      { id: 'ing-3', item: 'Queso Parmigiano Reggiano rallado fino', amount: 90, unit: 'g', checked: false },
      { id: 'ing-4', item: 'Agua de cocción de la pasta', amount: 120, unit: 'ml', checked: false },
      { id: 'ing-5', item: 'Pimienta negra recién molida', amount: 1, unit: 'cucharadita', checked: false },
      { id: 'ing-6', item: 'Sal gruesa para el agua de la pasta', amount: 15, unit: 'g', checked: false }
    ],
    instructions: [
      { id: 'step-1', stepNumber: 1, instruction: 'Pon a hervir abundante agua con sal en una olla amplia.', completed: false },
      { id: 'step-2', stepNumber: 2, instruction: 'Cocina los fettuccine al dente (1 minuto menos de lo que indica el paquete). Reserva 1 taza de agua caliente con almidón.', completed: false },
      { id: 'step-3', stepNumber: 3, instruction: 'En una sartén a fuego muy bajo, derrite suavemente la mantequilla con media taza del agua de cocción reservada.', completed: false },
      { id: 'step-4', stepNumber: 4, instruction: 'Transfiere la pasta directamente a la sartén. Retira del fuego directo.', completed: false },
      { id: 'step-5', stepNumber: 5, instruction: 'Agrega el queso Parmigiano gradualmente mientras remueves y mantecas vigorosamente con pinzas hasta formar una emulsión cremosa y brillante.', completed: false },
      { id: 'step-6', stepNumber: 6, instruction: 'Sirve de inmediato con abundante pimienta negra recién molida.', tip: 'No recalientes en microondas; la salsa se separaría.', completed: false }
    ]
  },
  {
    id: 'receta-tacos-birria-yt',
    title: 'Quesabirrias Crujientes de Res con Consomé',
    description: 'Video de YouTube con más de 2 millones de vistas enseñando la técnica de cocción lenta y sellado de tortillas con grasa de birria.',
    sourceUrl: 'https://www.youtube.com/watch?v=kY9JkXq6M8I',
    sourcePlatform: 'youtube',
    author: 'Cocina Mexicana Tradicional',
    prepTimeMinutes: 20,
    cookTimeMinutes: 120,
    totalTimeMinutes: 140,
    servings: 4,
    category: 'Almuerzo/Cena',
    difficulty: 'Media',
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop&q=80',
    tags: ['Tacos', 'Mexicana', 'Birria', 'Carne'],
    notes: 'Puedes usar olla exprés para reducir el tiempo de cocción de la carne a 45 minutos.',
    createdAt: '2026-09-08T10:15:00.000Z',
    ingredients: [
      { id: 'ing-10', item: 'Costilla o falda de res cortada en trozos', amount: 1, unit: 'kg', checked: false },
      { id: 'ing-11', item: 'Chiles guajillo desvenados', amount: 4, unit: 'piezas', checked: false },
      { id: 'ing-12', item: 'Chiles ancho desvenados', amount: 2, unit: 'piezas', checked: false },
      { id: 'ing-13', item: 'Dientes de ajo', amount: 4, unit: 'dientes', checked: false },
      { id: 'ing-14', item: 'Tortillas de maíz', amount: 12, unit: 'piezas', checked: false },
      { id: 'ing-15', item: 'Queso Oaxaca o mozzarella rallado', amount: 300, unit: 'g', checked: false },
      { id: 'ing-16', item: 'Cilantro fresco y cebolla picada', amount: 1, unit: 'taza', checked: false },
      { id: 'ing-17', item: 'Limones en mitades', amount: 3, unit: 'piezas', checked: false }
    ],
    instructions: [
      { id: 'step-10', stepNumber: 1, instruction: 'Hidrata los chiles en agua caliente durante 10 minutos y licúalos con ajo, comino, orégano y un chorrito de vinagre.', completed: false },
      { id: 'step-11', stepNumber: 2, instruction: 'Sella la carne en una olla, vierte el adobo colado, agrega hojas de laurel y cubre con agua o caldo. Cocina a fuego lento por 2 horas hasta que esté suave.', completed: false },
      { id: 'step-12', stepNumber: 3, instruction: 'Retira la carne, deshébrala y reserva el caldo rojo (consomé). Separa la grasita que flota arriba.', completed: false },
      { id: 'step-13', stepNumber: 4, instruction: 'Pasa las tortillas por la grasa de la superficie del consomé y ponlas en una plancha caliente.', completed: false },
      { id: 'step-14', stepNumber: 5, instruction: 'Rellena con queso abundante y carne deshebrada. Dobla a la mitad y dora por ambos lados hasta que el queso esté derretido y la tortilla crocante.', completed: false },
      { id: 'step-15', stepNumber: 6, instruction: 'Sirve con un tazón de consomé caliente, cebolla, cilantro y limón para chopear.', completed: false }
    ]
  },
  {
    id: 'receta-tarta-queso-fb',
    title: 'Tarta de Queso Vasca La Viña (Basque Burnt Cheesecake)',
    description: 'Publicación de un grupo de repostería en Facebook con la receta infalible de 5 ingredientes y centro ultra cremoso.',
    sourceUrl: 'https://www.facebook.com/groups/recetasfaciles/posts/984210398/',
    sourcePlatform: 'facebook',
    author: 'Comunidad Dulces Caseros',
    prepTimeMinutes: 15,
    cookTimeMinutes: 40,
    totalTimeMinutes: 55,
    servings: 8,
    category: 'Postre',
    difficulty: 'Fácil',
    imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&auto=format&fit=crop&q=80',
    tags: ['Postre', 'Cheesecake', 'Sin Horno Complicado', 'Dulces'],
    notes: 'Todos los ingredientes deben estar a temperatura ambiente para evitar grumos.',
    createdAt: '2026-09-08T18:00:00.000Z',
    ingredients: [
      { id: 'ing-20', item: 'Queso crema tipo Philadelphia', amount: 500, unit: 'g', checked: false },
      { id: 'ing-21', item: 'Huevos grandes', amount: 4, unit: 'piezas', checked: false },
      { id: 'ing-22', item: 'Azúcar blanco', amount: 180, unit: 'g', checked: false },
      { id: 'ing-23', item: 'Nata líquida para montar (35% materia grasa)', amount: 250, unit: 'ml', checked: false },
      { id: 'ing-24', item: 'Harina de trigo o maicena', amount: 1, unit: 'cucharada', checked: false },
      { id: 'ing-25', item: 'Pizca de sal fina', amount: 1, unit: 'pizca', checked: false }
    ],
    instructions: [
      { id: 'step-20', stepNumber: 1, instruction: 'Precalienta el horno a 210°C (410°F) con calor arriba y abajo.', completed: false },
      { id: 'step-21', stepNumber: 2, instruction: 'Arruga una hoja de papel vegetal, humedécela ligeramente y forra un molde desmontable de 20-22 cm.', completed: false },
      { id: 'step-22', stepNumber: 3, instruction: 'Bate el queso crema con el azúcar hasta que quede liso y sin grumos.', completed: false },
      { id: 'step-23', stepNumber: 4, instruction: 'Incorpora los huevos uno a uno batiendo suavemente sin meter demasiado aire.', completed: false },
      { id: 'step-24', stepNumber: 5, instruction: 'Agrega la cucharada de harina tamizada con la pizca de sal y por último vierte la nata.', completed: false },
      { id: 'step-25', stepNumber: 6, instruction: 'Vierte en el molde y hornea durante 40-45 minutos hasta que la superficie esté dorada oscura y el centro tiemble tipo flan.', completed: false },
      { id: 'step-26', stepNumber: 7, instruction: 'Deja enfriar a temperatura ambiente durante al menos 4 horas antes de desmoldar.', tip: 'No la refrigeres antes de que esté a temperatura ambiente.', completed: false }
    ]
  }
];
