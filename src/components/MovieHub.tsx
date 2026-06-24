import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  Play,
  Info,
  Plus,
  Check,
  Star,
  Clock,
  Calendar,
  Globe,
  User,
  X,
  Film,
  Search,
  Settings,
  Filter,
  ArrowRight,
  TrendingUp,
  Award,
  Sparkles,
  Tv,
  Layers,
  ChevronLeft,
  ChevronRight,
  Heart,
  PlusCircle,
  CheckCircle,
  Clapperboard,
  HelpCircle,
  Eye,
  Menu,
} from "lucide-react";
import { Movie } from "../types";
import { cn } from "../lib/utils";
import FlixSplash from "./FlixSplash";

// High-fidelity Seeded Catalog to guarantee beautiful streaming shelves are always rich
const SEEDED_CATALOG: Movie[] = [];

/*
const DEPRECATED_SEEDED_CATALOG: Movie[] = [
  {
    id: "seed-dune2",
    title: "Dune : Deuxième Partie",
    originalTitle: "Dune: Part Two",
    year: "2024",
    duration: "2h 46m",
    genres: ["Science-fiction", "Action", "Drame"],
    country: "USA",
    language: "Français",
    director: "Denis Villeneuve",
    actors: ["Timothée Chalamet", "Zendaya", "Rebecca Ferguson", "Austin Butler", "Florence Pugh"],
    summary: "Paul Atreides s'unit à Chani et aux Fremen pour mener la révolte contre les conspirateurs qui ont détruit sa famille. Hanté par de sombres prémonitions, il doit choisir entre l'amour de sa vie et le destin de l'univers pour préserver ses alliés.",
    poster: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=600",
    banner: "https://images.unsplash.com/photo-1547483238-2cbf88bc0269?q=80&w=1600",
    trailerUrl: "https://www.youtube.com/watch?v=Way9Dexny3w",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    ratingImdb: 8.6,
    quality: "4K",
    isNew: true,
    isPopular: true,
    viewCount: 15450
  },
  {
    id: "seed-oppenheimer",
    title: "Oppenheimer",
    originalTitle: "Oppenheimer",
    year: "2023",
    duration: "3h 00m",
    genres: ["Drame", "Histoire", "Science-fiction"],
    country: "USA",
    language: "Français",
    director: "Christopher Nolan",
    actors: ["Cillian Murphy", "Emily Blunt", "Matt Damon", "Robert Downey Jr."],
    summary: "Une immersion magistrale dans l'esprit du physicien J. Robert Oppenheimer, directeur scientifique du projet Manhattan à Los Alamos, conduisant à la création de la première bombe atomique et redéfinissant à jamais l'équilibre géopolitique mondial.",
    poster: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=600",
    banner: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?q=80&w=1600",
    trailerUrl: "https://www.youtube.com/watch?v=bK6ld5GEAm4",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    ratingImdb: 8.4,
    quality: "4K",
    isNew: false,
    isPopular: true,
    viewCount: 12812
  },
  {
    id: "seed-tlou",
    title: "The Last of Us",
    originalTitle: "The Last of Us",
    year: "2023",
    duration: "Saison 1",
    genres: ["Aventure", "Drame", "Science-fiction", "Action"],
    country: "USA",
    language: "Français",
    director: "Craig Mazin, Neil Druckmann",
    actors: ["Pedro Pascal", "Bella Ramsey", "Gabriel Luna", "Anna Torv"],
    summary: "Joel, un survivant endurci au tempérament désabusé, accepte d'escorter la jeune Ellie, 14 ans, à travers un pays infecté et dévasté par des spores mortels, dans l'espoir de synthétiser un vaccin universel.",
    poster: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=600",
    banner: "https://images.unsplash.com/photo-1544256718-3bcf237f3974?q=80&w=1600",
    trailerUrl: "https://www.youtube.com/watch?v=uLtkt8BonwM",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    ratingImdb: 8.8,
    quality: "4K",
    isNew: true,
    isPopular: true,
    viewCount: 18320,
    category: "trend"
  },
  {
    id: "seed-strangerthings",
    title: "Stranger Things",
    originalTitle: "Stranger Things",
    year: "2022",
    duration: "Saison 4",
    genres: ["Science-fiction", "Aventure", "Drame"],
    country: "USA",
    language: "Français",
    director: "The Duffer Brothers",
    actors: ["Millie Bobby Brown", "Finn Wolfhard", "Winona Ryder", "David Harbour"],
    summary: "Tandis que d'effrayants mystères planent sur la petite ville d'Hawkins en Indiana, une bande d'adolescents courageux s'oppose aux expériences d'un laboratoire top-secret et aux monstruosités nées du 'Monde à l'Envers'.",
    poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600",
    banner: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?q=80&w=1600",
    trailerUrl: "https://www.youtube.com/watch?v=b9EkMc79ZSU",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    ratingImdb: 8.7,
    quality: "UHD",
    isNew: false,
    isPopular: true,
    viewCount: 25400,
    category: "trend"
  },
  {
    id: "seed-avatar2",
    title: "Avatar : La Voie de l'Eau",
    originalTitle: "Avatar: The Way of Water",
    year: "2022",
    duration: "3h 12m",
    genres: ["Action", "Science-fiction", "Aventure"],
    country: "USA",
    language: "Français",
    director: "James Cameron",
    actors: ["Sam Worthington", "Zoe Saldana", "Sigourney Weaver", "Kate Winslet"],
    summary: "Se déroulant plus d'une décennie après la révolte na'vi originale, Jake Sully et sa famille fuient leur forêt natale pour rejoindre les récifs de Pandora lors d'une nouvelle offensive destructrice lancée par les Terriens.",
    poster: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=600",
    banner: "https://images.unsplash.com/photo-1500485035595-cbe6f645feb1?q=80&w=1600",
    trailerUrl: "https://www.youtube.com/watch?v=d9MyW72ELq0",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    ratingImdb: 7.6,
    quality: "4K",
    isNew: false,
    isPopular: false,
    viewCount: 9870
  },
  {
    id: "seed-interstellar",
    title: "Interstellar",
    originalTitle: "Interstellar",
    year: "2014",
    duration: "2h 49m",
    genres: ["Science-fiction", "Aventure", "Drame"],
    country: "USA",
    language: "Français",
    director: "Christopher Nolan",
    actors: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain", "Michael Caine"],
    summary: "Pendant que des tempêtes de poussière condamnent irrémédiablement l'agriculture humaine sur Terre, un vaillant équipage d'astronautes traverse un trou de ver mystérieux à la recherche d'exoplanètes propices à notre salut.",
    poster: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600",
    banner: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=1600",
    trailerUrl: "https://www.youtube.com/watch?v=zSWdZAZE3mI",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    ratingImdb: 8.7,
    quality: "UHD",
    isNew: false,
    isPopular: true,
    viewCount: 19400
  },
  {
    id: "seed-lupin",
    title: "Lupin",
    originalTitle: "Lupin",
    year: "2023",
    duration: "Saison 3",
    genres: ["Action", "Drame", "Séries françaises"],
    country: "France",
    language: "Français",
    director: "Louis Leterrier",
    actors: ["Omar Sy", "Ludivine Sagnier", "Antoine Gouy"],
    summary: "Inspiré par la fantaisie littéraire d'Arsène Lupin, le gentleman cambrioleur Assane Diop organise le casse parfait au Louvre afin d'élucider le décès de son père, injustement accusé de vol par la dynastie Pellegrini.",
    poster: "https://images.unsplash.com/photo-1508921912186-1d1a45ebb3c1?q=80&w=600",
    banner: "https://images.unsplash.com/photo-1522083165195-342750297f46?q=80&w=1600",
    trailerUrl: "https://www.youtube.com/watch?v=ga0iTWXCGa0",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    ratingImdb: 7.5,
    quality: "HD",
    isNew: true,
    isPopular: true,
    viewCount: 14450,
    category: "trend"
  },
  {
    id: "seed-bdl",
    title: "Le Bureau des Légendes",
    originalTitle: "Le Bureau des Légendes",
    year: "2020",
    duration: "Saison 5",
    genres: ["Drame", "Action", "Séries françaises"],
    country: "France",
    language: "Français",
    director: "Éric Rochant",
    actors: ["Mathieu Kassovitz", "Sara Giraudeau", "Jean-Pierre Darroussin"],
    summary: "Le département le plus secret de la DGSE dirige à distance les agents infiltrés 'sous légende'. De retour de Syrie, Malotru enfreint la règle sacrée en reprenant contact avec sa maîtresse syrienne sous sa fausse identité.",
    poster: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=600",
    banner: "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=1600",
    trailerUrl: "https://www.youtube.com/watch?v=D-n8gDWe8Kk",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    ratingImdb: 8.7,
    quality: "HD",
    isNew: false,
    isPopular: false,
    viewCount: 8890,
    category: "top"
  },
  {
    id: "seed-planete",
    title: "Notre Planète",
    originalTitle: "Our Planet",
    year: "2023",
    duration: "Saison 2",
    genres: ["Documentaires", "Science-fiction"],
    country: "UK",
    language: "Français",
    director: "Alastair Fothergill",
    actors: ["David Attenborough"],
    summary: "Ce splendide portrait cinématographique dévoile la vie animale sous un jour sans précédent. Explorez les habitats les plus reculés de la Terre tout en mesurant l'incidence de l'activité humaine sur leur équilibre fragile.",
    poster: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=600",
    banner: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1600",
    trailerUrl: "https://www.youtube.com/watch?v=aETNYyrqNYE",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    ratingImdb: 9.3,
    quality: "4K",
    isNew: true,
    isPopular: true,
    viewCount: 22120,
    category: "top"
  },
  {
    id: "seed-spiderman",
    title: "Spider-Man : Across the Spider-Verse",
    originalTitle: "Spider-Man: Across the Spider-Verse",
    year: "2023",
    duration: "2h 20m",
    genres: ["Animation", "Action", "Science-fiction"],
    country: "USA",
    language: "Français",
    director: "Joaquim Dos Santos",
    actors: ["Shameik Moore", "Hailee Steinfeld", "Oscar Isaac", "Jake Johnson"],
    summary: "Miles Morales revient pour une aventure épique à travers le Multivers, où il est accueilli par une ligue de Spider-Héros d'élite. Face à une menace sans précédent, Miles doit réécrire son destin.",
    poster: "https://images.unsplash.com/photo-1608889174633-414436322384?q=80&w=600",
    banner: "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1600",
    trailerUrl: "https://www.youtube.com/watch?v=cqGjhVJWtEg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    ratingImdb: 8.6,
    quality: "4K",
    isNew: false,
    isPopular: true,
    viewCount: 17750
  },
  {
    id: "seed-barbie",
    title: "Barbie",
    originalTitle: "Barbie",
    year: "2023",
    duration: "1h 54m",
    genres: ["Comédie", "Drame"],
    country: "USA",
    language: "Français",
    director: "Greta Gerwig",
    actors: ["Margot Robbie", "Ryan Gosling", "America Ferrera"],
    summary: "Exclue de Barbieland pour ne pas être une poupée assez parfaite, Barbie s'envole vers le monde réel en compagnie de Ken. Ils découvrent la rugueuse réalité et les subtilités du patriarcat.",
    poster: "https://images.unsplash.com/photo-1594744803329-e58b31de215f?q=80&w=600",
    banner: "https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=1600",
    trailerUrl: "https://www.youtube.com/watch?v=pBk4NYhWNMM",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    ratingImdb: 6.9,
    quality: "HD",
    isNew: false,
    isPopular: false,
    viewCount: 7520
  }
];

// Seeded Seasons & Episodes for all TV Series to ensure high fidelity interactions
const SEEDED_SERIES_EPISODES: Record<string, { seasonNumber: number; episodes: any[] }[]> = {
  "seed-tlou": [
    {
      seasonNumber: 1,
      episodes: [
        { id: "tlou-ep1", episodeNumber: 1, title: "Quand tu es perdu dans les ténèbres", duration: "1h 21m", summary: "Vingt ans après qu'une terrible pandémie fongique a décimé l'humanité, Joel, un rescapé blessé par la vie, accepte un contrat d'escorte hors de prix.", thumbnail: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=400", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" },
        { id: "tlou-ep2", episodeNumber: 2, title: "Infecté", duration: "53m", summary: "Tess et Joel escortent la jeune Ellie à travers les ruines ensevelies de Boston. Ils doivent faire face à un musée infesté d'effrayants Claqueurs.", thumbnail: "https://images.unsplash.com/photo-1544256718-3bcf237f3974?q=80&w=400", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4" },
        { id: "tlou-ep3", episodeNumber: 3, title: "Long, Long Time", duration: "1h 15m", summary: "La rencontre et la destinée bouleversante de Bill et Frank, deux survivants reclus qui s'unissent pour recréer un royaume de douceur.", thumbnail: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=400", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" }
      ]
    }
  ],
  "seed-strangerthings": [
    {
      seasonNumber: 1,
      episodes: [
        { id: "st-ep1", episodeNumber: 1, title: "La Disparition de Will Byers", duration: "48m", summary: "Sur le chemin du retour d'une partie de jeu de rôle, Will croise une ombre affreuse. Ses camarades de classe font une curieuse rencontre.", thumbnail: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?q=80&w=400", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" },
        { id: "st-ep2", episodeNumber: 2, title: "La Barjot de Maple Street", duration: "55m", summary: "Mike installe secrètement Onze dans son sous-sol. Le shérif Hopper inspecte une cabane mystérieuse suite à des plaintes d'habitants.", thumbnail: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" }
      ]
    }
  ],
  "seed-lupin": [
    {
      seasonNumber: 1,
      episodes: [
        { id: "lupin-ep1", episodeNumber: 1, title: "Chapitre 1 : Le Collier d'Arsène", duration: "47m", summary: "Assane conçoit un coup insensé pour dérober un richissime collier exposé au Louvres, lié à l'arrestation suspecte de son pauvre père.", thumbnail: "https://images.unsplash.com/photo-1522083165195-342750297f46?q=80&w=400", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" }
      ]
    }
  ],
  "seed-bdl": [
    {
      seasonNumber: 1,
      episodes: [
        { id: "bdl-ep1", episodeNumber: 1, title: "Sous Légende", duration: "52m", summary: "Après six ans de mission secrète en Syrie, Guillaume Debailly, alias Malotru, rentre à Paris. Mais résister à sa double vie s'avère impossible.", thumbnail: "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=400", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4" }
      ]
    }
  ],
  "seed-planete": [
    {
      seasonNumber: 1,
      episodes: [
        { id: "planete-ep1", episodeNumber: 1, title: "Des Mondes Gelés", duration: "51m", summary: "Découvrez les créatures majestueuses des banquises arctiques et antarctiques, luttant pour s'adapter à la fonte tragique des glaces.", thumbnail: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=400", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" }
      ]
    }
  ]
};
*/

const SEEDED_SERIES_EPISODES: Record<
  string,
  { seasonNumber: number; episodes: any[] }[]
> = {};

interface MovieHubProps {
  onChannelSelect: (movie: Movie) => void;
  onGoToSettings?: () => void;
  deviceType: string;
  continueWatching?: { [id: string]: number };
  moviesList?: Movie[];
  onNavigate?: (section: string) => void;
}

export default function MovieHub({
  onChannelSelect,
  onGoToSettings,
  deviceType,
  continueWatching = {},
  moviesList,
  onNavigate,
}: MovieHubProps) {
  // Denden Flix state machine - only show splash once per session for fluidity
  const [showSplash, setShowSplash] = useState(() => {
    return sessionStorage.getItem("denden_flix_splash_seen") !== "true";
  });
  const [dbMovies, setDbMovies] = useState<Movie[]>(moviesList || []);
  const [loading, setLoading] = useState(false);

  // Tabs: 'accueil' (home), 'movies' (films), 'series', 'search', 'mylist'
  const [currentTab, setCurrentTab] = useState<
    "accueil" | "movies" | "series" | "search" | "mylist"
  >("accueil");
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  // Details screen extra state
  const [activeSeason, setActiveSeason] = useState<number>(1);

  // Search parameters
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // My list saved items (localStorage persistence)
  const [myList, setMyList] = useState<string[]>([]);

  // Carousel Hero Spotlight Index
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  // Hamburger Menu Open state
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Selected genre filter for dedicated Movies view
  const [selectedGenre, setSelectedGenre] = useState<string>("Tous");

  const isMobile = deviceType === "mobile" || deviceType === "tablet";

  // 1. Load data
  useEffect(() => {
    if (!moviesList) {
      setLoading(true);
      axios
        .get("/api/movies")
        .then((res) => {
          setDbMovies(res.data);
        })
        .catch((err) => console.error("Error fetching movies from DB:", err))
        .finally(() => setLoading(false));
    } else {
      setDbMovies(moviesList);
    }
  }, [moviesList]);

  // Do NOT auto-merge seeded catalog demos to respect the user's intent of removing demos
  const movies = useMemo(() => {
    return dbMovies;
  }, [dbMovies]);

  // Importer le catalogue officiel en 1-clic pour les démos si demandé
  const handleLoadDemoCatalog = async () => {
    try {
      setLoading(true);
      const res = await axios.post("/api/movies/batch", SEEDED_CATALOG);
      if (res.data.success) {
        toast.success("Catalogue de démonstration importé avec succès !");
        setDbMovies(SEEDED_CATALOG);
      }
    } catch (err) {
      console.error("Error importing demo catalog:", err);
      toast.error("Erreur lors de l'importation du catalogue");
    } finally {
      setLoading(false);
    }
  };

  // Load and synchronize "Ma Liste" and "Historique"
  useEffect(() => {
    const savedList = localStorage.getItem("denden_my_list");
    if (savedList) {
      try {
        setMyList(JSON.parse(savedList));
      } catch (e) {}
    }

    const savedHistory = localStorage.getItem("denden_movie_search_history");
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {}
    }
  }, []);

  const handleToggleMyList = (movieId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    let newList = [...myList];
    if (newList.includes(movieId)) {
      newList = newList.filter((id) => id !== movieId);
      toast.success("Retiré de votre liste");
    } else {
      newList.push(movieId);
      toast.success("Ajouté à votre liste !");
    }
    setMyList(newList);
    localStorage.setItem("denden_my_list", JSON.stringify(newList));
  };

  // Rotate Spotlight Hero Section every 7 seconds beautifully
  useEffect(() => {
    if (currentTab !== "accueil") return;
    const interval = setInterval(() => {
      setSpotlightIndex((prev) => (prev + 1) % 3);
    }, 8000);
    return () => clearInterval(interval);
  }, [currentTab]);

  // Top 3 featured spotlight items derived from our active catalog dynamically
  const spotlightMovies = useMemo(() => {
    return movies.slice(0, 3);
  }, [movies]);

  const activeSpotlight = useMemo(() => {
    if (spotlightMovies.length === 0) return null;
    return spotlightMovies[spotlightIndex % spotlightMovies.length];
  }, [spotlightMovies, spotlightIndex]);

  // Extract all existing genres
  const availableGenres = useMemo(() => {
    const list = new Set<string>();
    movies.forEach((m) => {
      if (m.genres && Array.isArray(m.genres)) {
        m.genres.forEach((g) => {
          if (g && g.trim()) list.add(g.trim());
        });
      }
    });
    return ["Tous", ...Array.from(list)];
  }, [movies]);

  // "Continuer à Regarder" resume system - return only actual items to remove demos
  const continueWatchingMovies = useMemo(() => {
    const ids = Object.keys(continueWatching);
    const realList = movies
      .filter((m) => ids.includes(m.id))
      .map((m) => ({
        ...m,
        progress: continueWatching[m.id],
        timeRemaining: Math.ceil(((100 - continueWatching[m.id]) / 100) * 120), // simulated
      }));
    return realList;
  }, [movies, continueWatching]);

  // Section categories for movies & series shelves
  const filterBySection = (
    type: "movies" | "series",
    categoryName?: string,
    genreName?: string,
  ) => {
    return movies.filter((m) => {
      // Determine if a content is a Series vs Movie based on category keyword, standard tag, season duration text or metadata
      const isSeries =
        m.category === "trend" ||
        m.id.includes("st-") ||
        m.id.includes("tlou-") ||
        m.id.includes("lupin") ||
        m.id.includes("bdl-") ||
        m.id.includes("planete") ||
        m.duration.toLowerCase().includes("saison") ||
        !!SEEDED_SERIES_EPISODES[m.id];

      const matchType = type === "movies" ? !isSeries : isSeries;
      if (!matchType) return false;

      if (categoryName) {
        if (categoryName === "popular" && !m.isPopular) return false;
        if (categoryName === "new" && !m.isNew) return false;
        if (categoryName === "top" && m.ratingImdb && m.ratingImdb < 8.2)
          return false;
        if (categoryName === "french" && m.country?.toLowerCase() !== "france")
          return false;
        if (categoryName === "intl" && m.country?.toLowerCase() === "france")
          return false;
      }

      if (genreName) {
        if (
          !m.genres ||
          !m.genres.some((g) => g.toLowerCase() === genreName.toLowerCase())
        )
          return false;
      }

      return true;
    });
  };

  // Top 10 items based on view counts
  const top10List = useMemo(() => {
    return [...movies]
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 10);
  }, [movies]);

  // Unified lists
  const sortedMovies = useMemo(() => {
    return filterBySection("movies").sort(
      (a, b) => parseInt(b.year) - parseInt(a.year),
    );
  }, [movies]);

  const filteredMoviesList = useMemo(() => {
    return sortedMovies.filter((m) => {
      if (selectedGenre === "Tous") return true;
      return (
        m.genres &&
        m.genres.some((g) => g.toLowerCase() === selectedGenre.toLowerCase())
      );
    });
  }, [sortedMovies, selectedGenre]);

  // Search filter matching Acteurs, Directeurs, Genres and Titles
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const queryParts = searchQuery
      .toLowerCase()
      .trim()
      .split(" ")
      .filter(Boolean);
    return movies.filter((m) => {
      return queryParts.every((part) => {
        const matchTitle =
          m.title.toLowerCase().includes(part) ||
          (m.originalTitle && m.originalTitle.toLowerCase().includes(part));
        const matchDirector = m.director?.toLowerCase().includes(part);
        const matchActors =
          m.actors && m.actors.some((a) => a.toLowerCase().includes(part));
        const matchGenres =
          m.genres && m.genres.some((g) => g.toLowerCase().includes(part));
        return matchTitle || matchDirector || matchActors || matchGenres;
      });
    });
  }, [movies, searchQuery]);

  // Dynamic suggestion tags based on queried keyword
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchSuggestions([]);
      return;
    }
    const query = searchQuery.toLowerCase().trim();
    const suggestionsSet = new Set<string>();

    movies.forEach((m) => {
      // Titles matching
      if (m.title.toLowerCase().includes(query)) {
        suggestionsSet.add(m.title);
      }
      // Actors
      if (m.actors) {
        m.actors.forEach((actor) => {
          if (actor.toLowerCase().includes(query)) suggestionsSet.add(actor);
        });
      }
      // Genres
      m.genres.forEach((genre) => {
        if (genre.toLowerCase().includes(query)) suggestionsSet.add(genre);
      });
    });

    setSearchSuggestions(Array.from(suggestionsSet).slice(0, 5));
  }, [searchQuery, movies]);

  const handleAddSearchHistory = (term: string) => {
    if (!term.trim()) return;
    const cleanTerm = term.trim();
    const nextHistory = [
      cleanTerm,
      ...searchHistory.filter((h) => h !== cleanTerm),
    ].slice(0, 10);
    setSearchHistory(nextHistory);
    localStorage.setItem(
      "denden_movie_search_history",
      JSON.stringify(nextHistory),
    );
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("denden_movie_search_history");
    toast.success("Historique effacé");
  };

  const mySavedMovies = useMemo(() => {
    return movies.filter((m) => myList.includes(m.id));
  }, [movies, myList]);

  // Saisons lists if applicable
  const seasonsData = useMemo(() => {
    if (!selectedMovie) return [];
    return SEEDED_SERIES_EPISODES[selectedMovie.id] || [];
  }, [selectedMovie]);

  const currentEpisodes = useMemo(() => {
    if (seasonsData.length === 0) return [];
    const s = seasonsData.find((item) => item.seasonNumber === activeSeason);
    return s ? s.episodes : [];
  }, [seasonsData, activeSeason]);

  // Execute actual play trigger
  const handleLaunchItem = (movie: Movie) => {
    onChannelSelect(movie);
    // Auto add to continue watching simulation
    toast.success(`Lecture démarrée : ${movie.title}`);
  };

  // Carousel slider container scroll functions
  const scrollContainer = (id: string, dir: "left" | "right") => {
    const el = document.getElementById(id);
    if (el) {
      const scrollAmt = dir === "left" ? -400 : 400;
      el.scrollBy({ left: scrollAmt, behavior: "smooth" });
    }
  };

  if (showSplash) {
    return (
      <FlixSplash
        onFinish={() => {
          sessionStorage.setItem("denden_flix_splash_seen", "true");
          setShowSplash(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-32 font-sans select-none overflow-x-hidden relative">
      {/* Subtle Cinematic Vignette instead of multi-colored neon blobs */}
      <div className="absolute top-0 inset-x-0 h-[60vh] bg-gradient-to-b from-[#E50914]/[0.05] via-[#141414]/0 to-transparent pointer-events-none" />
      <div className="absolute top-[20vh] left-[5%] w-[400px] h-[400px] bg-red-900/[0.03] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20vh] right-[10%] w-[500px] h-[500px] bg-neutral-900/[0.05] rounded-full blur-[150px] pointer-events-none" />

      {/* Header bar within MovieHub */}
      <div className="fixed top-0 inset-x-0 bg-gradient-to-b from-black/80 via-black/45 to-transparent z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="font-black tracking-tighter text-2xl uppercase text-[#E50914] drop-shadow-[0_2px_10px_rgba(229,9,20,0.55)] leading-none"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              transform: "scaleY(1.15)",
            }}
          >
            DENDEN FLIX
          </span>
          <span className="bg-red-600/10 border border-[#E50914]/30 rounded px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-[#E50914] ml-2">
            ORIGINAL
          </span>
        </div>

        {/* Top actions and navigation */}
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 text-xs font-black uppercase tracking-widest text-white/50">
            <button
              onClick={() => setCurrentTab("accueil")}
              className={cn(
                "hover:text-white transition-colors",
                currentTab === "accueil" && "text-white",
              )}
            >
              Accueil
            </button>
            <button
              onClick={() => setCurrentTab("movies")}
              className={cn(
                "hover:text-white transition-colors",
                currentTab === "movies" && "text-white",
              )}
            >
              Films
            </button>
            <button
              onClick={() => setCurrentTab("series")}
              className={cn(
                "hover:text-white transition-colors",
                currentTab === "series" && "text-white",
              )}
            >
              Séries
            </button>
            <button
              onClick={() => setCurrentTab("mylist")}
              className={cn(
                "hover:text-white transition-colors",
                currentTab === "mylist" && "text-white",
              )}
            >
              Ma Liste
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentTab("search")}
              className={cn(
                "p-2.5 rounded-full bg-white/[0.02] hover:bg-white/[0.08] transition-all border border-white/[0.05] group focus:ring-4 focus:ring-[#E50914]/30 focus:outline-none",
                currentTab === "search" &&
                  "bg-[#E50914]/10 border-[#E50914]/30 text-[#E50914]",
              )}
            >
              <Search
                size={16}
                className={cn(
                  "text-white/60 transition-colors",
                  currentTab === "search" && "text-[#E50914]",
                )}
              />
            </button>

            {onGoToSettings && (
              <button
                onClick={onGoToSettings}
                className="p-2.5 rounded-full bg-white/[0.02] hover:bg-white/[0.08] transition-all border border-white/[0.05] group focus:ring-4 focus:ring-[#E50914]/30 focus:outline-none"
                title="Paramètres bibliothèque"
                id="movie-hub-settings-btn"
              >
                <Settings
                  size={16}
                  className="text-white/60 group-hover:rotate-45 transition-transform"
                />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RENDER ACTIVE TAB VIEW */}
      <div className="pt-16 pb-20">
        {/* ================================= 
            TAB: ACCUEIL 
           ================================= */}
        {currentTab === "accueil" && (
          <div className="space-y-12">
            {/* Spotlight Sliding Banner */}
            {!activeSpotlight && (
              <div className="flex flex-col items-center justify-center text-center px-6 py-28 max-w-lg mx-auto space-y-6">
                <div className="w-20 h-20 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center text-[#E50914] shadow-2xl animate-pulse">
                  <Film size={36} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-black uppercase tracking-wider text-white">
                    BIBLIOTHÈQUE VOD VIDE
                  </h2>
                  <p className="text-sm text-neutral-400">
                    Découvrez Denden Flix en ajoutant vos propres films et
                    séries depuis les paramètres.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-4 w-full">
                  {onGoToSettings && (
                    <button
                      onClick={onGoToSettings}
                      className="flex-w bg-white hover:bg-[#E50914] text-black hover:text-white font-black py-3 px-6 rounded-md transition-all active:scale-95 text-xs uppercase tracking-wider flex items-center justify-center gap-2 w-full"
                    >
                      <Settings size={14} />
                      Ajouter des Vidéos
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeSpotlight && (
              <div className="relative w-full h-[65vh] md:h-[82vh] mb-12 overflow-hidden flex flex-col justify-end">
                {/* Backdrop high-definition rendering */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-all duration-1000 scale-[1.01]"
                  style={{
                    backgroundImage: `url(${activeSpotlight.banner || activeSpotlight.poster})`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/45 to-[#141414]/10" />
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#141414] via-[#141414]/95 to-transparent" />
                <div className="absolute inset-y-0 left-0 w-full md:w-2/3 bg-gradient-to-r from-[#141414] via-[#141414]/65 to-transparent" />

                {/* Content Overlay */}
                <div className="relative p-6 sm:p-14 md:pb-24 max-w-4xl z-10 space-y-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className="flex items-center gap-1 bg-[#E50914] text-[9px] font-black px-3 py-1 rounded text-white tracking-widest leading-none shadow-lg shadow-red-500/20"
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: "12px",
                        letterSpacing: "0.1em",
                      }}
                    >
                      <Sparkles size={11} className="mr-0.5 animate-pulse" />
                      ORIGINAL DENDEN FLIX
                    </span>
                    <span className="text-yellow-400 text-[10px] font-black flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded border border-yellow-500/10">
                      <Star
                        size={11}
                        className="fill-current text-yellow-400"
                      />{" "}
                      {activeSpotlight.ratingImdb || "8.2"} IMDB
                    </span>
                    <span className="bg-[#10b981]/20 border border-[#10b981]/30 text-[#10b981] text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                      Dolby Vision
                    </span>
                    <span className="bg-red-600/10 border border-[#E50914]/30 text-[#E50914] text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                      HDR 4K
                    </span>
                  </div>

                  <h1 className="text-3xl sm:text-5xl md:text-6xl font-sans font-black tracking-tight leading-none uppercase bg-gradient-to-b from-white via-white to-neutral-300 bg-clip-text text-transparent drop-shadow-lg">
                    {activeSpotlight.title}
                  </h1>

                  <p className="text-neutral-300 text-xs md:text-sm font-medium leading-relaxed max-w-2xl drop-shadow line-clamp-2 md:line-clamp-3">
                    {activeSpotlight.summary}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-4">
                    <button
                      onClick={() => handleLaunchItem(activeSpotlight)}
                      className="bg-white text-black hover:bg-[#E50914] hover:text-white font-black py-3.5 px-8 rounded-md flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl text-xs uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#E50914]"
                      id="spotlight-play-btn"
                    >
                      <Play size={16} fill="currentColor" />
                      Regarder
                    </button>
                    <button
                      onClick={() => handleToggleMyList(activeSpotlight.id)}
                      className="bg-stone-500/30 hover:bg-stone-500/50 text-white font-black py-3.5 px-6 rounded-md flex items-center justify-center gap-2 transition-all active:scale-95 border border-white/10 backdrop-blur-md text-xs uppercase tracking-widest"
                      id="spotlight-mylist-btn"
                    >
                      {myList.includes(activeSpotlight.id) ? (
                        <>
                          <Check size={16} className="text-emerald-400" />
                          Ma Liste
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          Ma Liste
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setSelectedMovie(activeSpotlight)}
                      className="p-3 bg-white/5 hover:bg-white/15 border border-white/10 backdrop-blur-md rounded-full text-white hover:scale-105 transition-all"
                      title="En savoir plus"
                      id="spotlight-info-btn"
                    >
                      <Info size={18} />
                    </button>
                  </div>

                  {/* Indicator Dots */}
                  <div className="flex items-center gap-2 pt-6">
                    {spotlightMovies.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSpotlightIndex(idx)}
                        className={cn(
                          "h-1.5 rounded-full transition-all duration-300 focus:outline-none",
                          spotlightIndex % spotlightMovies.length === idx
                            ? "w-6 bg-[#E50914]"
                            : "w-1.5 bg-white/20",
                        )}
                        id={`spotlight-dot-${idx}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Continuer à Regarder Carousel */}
            {continueWatchingMovies.length > 0 && (
              <div className="px-6 sm:px-12 relative group/section">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                    <Clock size={14} className="text-[#E50914] animate-pulse" />{" "}
                    Reprendre la lecture
                  </h3>
                </div>
                <div className="relative">
                  <div
                    id="cw-carousel"
                    className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide snap-x scroll-smooth"
                  >
                    {continueWatchingMovies.map((movie) => (
                      <motion.div
                        key={`cw-${movie.id}`}
                        whileHover={{ y: -4, scale: 1.02 }}
                        className="relative snap-start shrink-0 w-[240px] sm:w-[280px] aspect-video rounded-lg overflow-hidden cursor-pointer group border border-white/[0.05] bg-neutral-900"
                        onClick={() => handleLaunchItem(movie)}
                      >
                        <img
                          src={movie.banner || movie.poster}
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-all duration-500 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />

                        {/* Shimmer linear loading effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent" />

                        <div className="absolute inset-x-4 bottom-3">
                          <h4 className="text-white font-black text-xs truncate drop-shadow">
                            {movie.title}
                          </h4>
                          <span className="text-[9px] font-bold text-neutral-400 mt-1 uppercase tracking-wider block">
                            Il reste {movie.timeRemaining || 40} min
                          </span>

                          {/* Netflix styled dynamic horizontal progress bar */}
                          <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#E50914] to-red-600 rounded-full"
                              style={{ width: `${movie.progress || 50}%` }}
                            />
                          </div>
                        </div>

                        {/* Centered Play Button */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-11 h-11 bg-white hover:bg-[#E50914] text-black hover:text-white rounded-full flex items-center justify-center shadow-2xl transition-all">
                            <Play
                              size={18}
                              fill="currentColor"
                              className="ml-0.5"
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Shelf: Dernières Sorties */}
            <div className="px-6 sm:px-12 relative group/section">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                  <Sparkles size={14} className="text-[#E50914]" /> Dernières
                  Sorties Cinéma & Séries
                </h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => scrollContainer("recent-carousel", "left")}
                    className="p-1.5 rounded-full bg-white/[0.02] border border-white/5 hover:bg-white/10 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => scrollContainer("recent-carousel", "right")}
                    className="p-1.5 rounded-full bg-white/[0.02] border border-white/5 hover:bg-white/10 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
              <div
                id="recent-carousel"
                className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x scroll-smooth"
              >
                {movies
                  .sort((a, b) => parseInt(b.year) - parseInt(a.year))
                  .slice(0, 10)
                  .map((movie) => (
                    <motion.div
                      key={`home-recent-${movie.id}`}
                      whileHover={{ scale: 1.05, y: -6 }}
                      className="snap-start shrink-0 w-[130px] sm:w-[170px] aspect-[2/3] rounded-md overflow-hidden cursor-pointer group border border-white/[0.05] relative bg-neutral-900 shadow-xl"
                      onClick={() => setSelectedMovie(movie)}
                    >
                      <img
                        src={movie.poster}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent opacity-90 group-hover:via-black/40 transition-all duration-300 flex flex-col justify-end p-3">
                        <div className="flex items-center justify-between gap-1 text-[8px] font-bold text-white/40 group-hover:text-white/70">
                          <span>{movie.quality}</span>
                          <span>{movie.year}</span>
                        </div>
                        <h4 className="text-[10px] sm:text-xs font-black text-white uppercase truncate mt-1 group-hover:text-[#E50914] transition-colors">
                          {movie.title}
                        </h4>

                        {/* Interactive IMDb score */}
                        <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <Star
                            size={10}
                            className="text-yellow-400 fill-current"
                          />
                          <span className="text-[9px] font-black text-white/70">
                            {movie.ratingImdb || "8.0"}
                          </span>
                        </div>
                      </div>

                      {/* Nouveau Badge */}
                      {movie.isNew && (
                        <div className="absolute top-2.5 left-2.5 bg-[#E50914] text-white text-[7px] font-black px-2.5 py-1 rounded shadow-md uppercase tracking-widest border border-red-500/20">
                          Nouveau
                        </div>
                      )}
                    </motion.div>
                  ))}
              </div>
            </div>

            {/* Shelf: Top 10 De La Semaine */}
            <div className="px-6 sm:px-12 relative group/section">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                  <Award size={14} className="text-[#E50914]" /> Les 10
                  Nouveautés Les Plus Cliquées
                </h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => scrollContainer("top-carousel", "left")}
                    className="p-1.5 rounded-full bg-white/[0.02] border border-white/5 hover:bg-white/10 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => scrollContainer("top-carousel", "right")}
                    className="p-1.5 rounded-full bg-white/[0.02] border border-white/5 hover:bg-white/10 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
              <div
                id="top-carousel"
                className="flex gap-8 overflow-x-auto pb-6 scrollbar-hide snap-x scroll-smooth pl-4 select-none"
              >
                {top10List.map((movie, index) => (
                  <div
                    key={`top10-${movie.id}`}
                    className="snap-start shrink-0 flex items-end relative w-[180px] sm:w-[230px] h-[220px] sm:h-[280px] cursor-pointer group"
                    onClick={() => setSelectedMovie(movie)}
                  >
                    {/* Stylised Massive Outlined Rank Number */}
                    <span
                      className="font-sans font-black text-[120px] sm:text-[180px] leading-none text-transparent tracking-tighter select-none z-10 mr-[-20px] sm:mr-[-35px] mb-[-10px] select-none text-stroke"
                      style={{ WebkitTextStroke: "2px rgba(255,255,255,0.22)" }}
                    >
                      {index + 1}
                    </span>

                    {/* Card Body */}
                    <div className="relative w-[110px] sm:w-[150px] aspect-[2/3] rounded-md overflow-hidden border border-white/[0.05] shadow-2xl bg-neutral-900 flex-1 z-20 overflow-hidden transform group-hover:scale-105 group-hover:-translate-y-2 transition-all duration-500">
                      <img
                        src={movie.poster}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent opacity-95 flex flex-col justify-end p-2 sm:p-3">
                        <span className="text-[7px] sm:text-[8px] font-black uppercase text-red-500">
                          {movie.genres[0]}
                        </span>
                        <h4 className="text-[9px] sm:text-[11px] font-black text-white uppercase truncate mt-0.5">
                          {movie.title}
                        </h4>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shelf: Séries Tendances */}
            <div className="px-6 sm:px-12 relative group/section">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                  <Tv size={14} className="text-[#E50914]" /> Séries Tendances
                  de la semaine
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
                {filterBySection("series", "popular")
                  .slice(0, 6)
                  .map((movie) => (
                    <motion.div
                      key={`home-popular-series-${movie.id}`}
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="relative aspect-[2/3] rounded-md overflow-hidden cursor-pointer group border border-white/[0.05] bg-neutral-900"
                      onClick={() => setSelectedMovie(movie)}
                    >
                      <img
                        src={movie.poster}
                        className="w-full h-full object-cover transition-all"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent opacity-95 p-3 flex flex-col justify-end">
                        <div className="flex items-center justify-between text-[8px] text-white/50">
                          <span>{movie.year}</span>
                          <span className="text-yellow-400 flex items-center gap-0.5">
                            <Star
                              size={8}
                              className="fill-current text-yellow-400"
                            />{" "}
                            {movie.ratingImdb || "8.5"}
                          </span>
                        </div>
                        <h4 className="text-[10px] sm:text-xs font-black text-white uppercase truncate mt-1 group-hover:text-[#E50914] transition-colors">
                          {movie.title}
                        </h4>
                        <span className="text-[8px] font-bold text-neutral-400 uppercase mt-0.5">
                          {movie.duration}
                        </span>
                      </div>

                      <div className="absolute top-2.5 right-2.5 bg-red-600/10 border border-[#E50914]/30 text-[#E50914] text-[7px] font-black px-2 py-0.5 rounded shadow-md uppercase tracking-widest leading-none">
                        SÉRIE
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>

            {/* Shelf: Recommandations personnalisées */}
            <div className="px-6 sm:px-12 relative group/section">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                  <Sparkles size={14} className="text-[#E50914]" />{" "}
                  Recommandations Personnalisées pour vous
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
                {movies
                  .filter((m) => m.ratingImdb && m.ratingImdb >= 8.5)
                  .slice(0, 6)
                  .map((movie) => (
                    <motion.div
                      key={`home-rec-${movie.id}`}
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="relative aspect-[2/3] rounded-md overflow-hidden cursor-pointer group border border-white/[0.05] bg-neutral-900"
                      onClick={() => setSelectedMovie(movie)}
                    >
                      <img
                        src={movie.poster}
                        className="w-full h-full object-cover transition-all"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent opacity-95 p-3 flex flex-col justify-end">
                        <div className="flex items-center justify-between text-[8px] text-white/50">
                          <span>{movie.year}</span>
                          <span className="text-yellow-400 flex items-center gap-0.5">
                            <Star
                              size={8}
                              className="fill-current text-yellow-400"
                            />{" "}
                            {movie.ratingImdb}
                          </span>
                        </div>
                        <h4 className="text-[10px] sm:text-xs font-black text-white uppercase truncate mt-1 group-hover:text-[#E50914] transition-colors">
                          {movie.title}
                        </h4>
                        <span className="text-[8px] font-bold text-white/30 uppercase truncate">
                          {movie.genres.join(", ")}
                        </span>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ================================= 
            TAB: FILMS 
           ================================= */}
        {currentTab === "movies" && (
          <div className="px-6 sm:px-12 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.05] pb-6">
              <div>
                <h1
                  className="text-4xl sm:text-5xl font-black tracking-tighter flex items-center gap-3 uppercase leading-none"
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    transform: "scaleY(1.1)",
                    transformOrigin: "left bottom",
                  }}
                >
                  <Clapperboard className="text-[#E50914]" size={36} />
                  DENDEN CINÉMA
                </h1>
                <p className="text-white/40 text-[9px] uppercase tracking-wider font-extrabold mt-2">
                  Découvrez nos {filterBySection("movies").length} films
                  blockbusters ultra haute définition
                </p>
              </div>

              {/* Horizontal pills category selection */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                {[
                  "Tous",
                  "Action",
                  "Science-fiction",
                  "Comédie",
                  "Animation",
                  "Documentaires",
                ].map((genre) => {
                  const isActive = selectedGenre === genre;
                  return (
                    <button
                      key={genre}
                      onClick={() => setSelectedGenre(genre)}
                      className={cn(
                        "px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all duration-300 whitespace-nowrap active:scale-95 focus:outline-none",
                        isActive
                          ? "bg-[#E50914] text-white border-transparent shadow-lg shadow-red-500/20 scale-105"
                          : "bg-white/[0.02] text-white/50 border-white/5 hover:border-white/20 hover:text-white",
                      )}
                      id={`genre-pill-${genre}`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List shelves for Films */}
            {selectedGenre === "Tous" ? (
              <div className="space-y-12">
                {/* Carousel 1: Derniers Ajouts */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1">
                    Dernières sorties en streaming
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
                    {filterBySection("movies", "new")
                      .slice(0, 6)
                      .map((movie) => (
                        <motion.div
                          key={`movies-new-${movie.id}`}
                          whileHover={{ scale: 1.05, y: -5 }}
                          className="relative aspect-[2/3] rounded-md overflow-hidden cursor-pointer group border border-white/[0.05] bg-neutral-900"
                          onClick={() => setSelectedMovie(movie)}
                        >
                          <img
                            src={movie.poster}
                            className="w-full h-full object-cover transition-all"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent opacity-95 p-3 flex flex-col justify-end">
                            <h4 className="text-[10px] sm:text-xs font-black text-white uppercase truncate group-hover:text-[#E50914]">
                              {movie.title}
                            </h4>
                            <span className="text-[8px] font-bold text-neutral-400 mt-0.5">
                              {movie.year} • {movie.duration}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                  </div>
                </div>

                {/* Carousel 2: Films populaires */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1">
                    Les films les plus populaires
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
                    {filterBySection("movies", "popular")
                      .slice(0, 6)
                      .map((movie) => (
                        <motion.div
                          key={`movies-pop-${movie.id}`}
                          whileHover={{ scale: 1.05, y: -5 }}
                          className="relative aspect-[2/3] rounded-md overflow-hidden cursor-pointer group border border-white/[0.05] bg-neutral-900"
                          onClick={() => setSelectedMovie(movie)}
                        >
                          <img
                            src={movie.poster}
                            className="w-full h-full object-cover transition-all"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent opacity-95 p-3 flex flex-col justify-end">
                            <h4 className="text-[10px] sm:text-xs font-black text-white uppercase truncate group-hover:text-[#E50914]">
                              {movie.title}
                            </h4>
                            <span className="text-[8px] font-bold text-neutral-400 mt-0.5">
                              {movie.year} • {movie.duration}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                  </div>
                </div>

                {/* Carousel 3: Films d'action */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1">
                    Cinéma d'Action & Aventure
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
                    {filterBySection("movies", undefined, "Action")
                      .slice(0, 6)
                      .map((movie) => (
                        <motion.div
                          key={`movies-act-${movie.id}`}
                          whileHover={{ scale: 1.05, y: -5 }}
                          className="relative aspect-[2/3] rounded-md overflow-hidden cursor-pointer group border border-white/[0.05] bg-neutral-900"
                          onClick={() => setSelectedMovie(movie)}
                        >
                          <img
                            src={movie.poster}
                            className="w-full h-full object-cover transition-all"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent opacity-95 p-3 flex flex-col justify-end">
                            <h4 className="text-[10px] sm:text-xs font-black text-white uppercase truncate group-hover:text-[#E50914]">
                              {movie.title}
                            </h4>
                            <span className="text-[8px] font-bold text-neutral-400 mt-0.5">
                              {movie.year} • {movie.duration}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              // Filtered Category Grid
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
                {filteredMoviesList.map((movie) => (
                  <motion.div
                    key={`movies-genre-filtered-${movie.id}`}
                    layout
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="relative aspect-[2/3] rounded-md overflow-hidden cursor-pointer group border border-white/[0.05] bg-neutral-900"
                    onClick={() => setSelectedMovie(movie)}
                  >
                    <img
                      src={movie.poster}
                      className="w-full h-full object-cover transition-all"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent opacity-95 p-3 flex flex-col justify-end">
                      <h4 className="text-[10px] sm:text-xs font-black text-white uppercase truncate group-hover:text-[#E50914]">
                        {movie.title}
                      </h4>
                      <span className="text-[8px] font-bold text-neutral-400 mt-0.5">
                        {movie.year} • {movie.duration}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================= 
            TAB: SÉRIES 
           ================================= */}
        {currentTab === "series" && (
          <div className="px-6 sm:px-12 space-y-12">
            <div>
              <h1
                className="text-4xl sm:text-5xl font-black tracking-tighter flex items-center gap-3 uppercase leading-none"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  transform: "scaleY(1.1)",
                  transformOrigin: "left bottom",
                }}
              >
                <Tv className="text-[#E50914]" size={36} />
                DENDEN SÉRIES & SHOWS
              </h1>
              <p className="text-white/40 text-[9px] uppercase tracking-wider font-extrabold mt-2">
                Les meilleures productions sérielles mondiales et françaises
                réunies sur une seule interface
              </p>
            </div>

            {/* Shelf: Séries tendances */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                🔥 Séries tendances de la semaine
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
                {filterBySection("series", "popular")
                  .slice(0, 6)
                  .map((movie) => (
                    <motion.div
                      key={`series-pop-${movie.id}`}
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="relative aspect-[2/3] rounded-md overflow-hidden cursor-pointer group border border-white/[0.05] bg-neutral-900"
                      onClick={() => setSelectedMovie(movie)}
                    >
                      <img
                        src={movie.poster}
                        className="w-full h-full object-cover transition-all"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent opacity-95 p-3 flex flex-col justify-end">
                        <h4 className="text-[10px] sm:text-xs font-black text-white uppercase truncate group-hover:text-[#E50914]">
                          {movie.title}
                        </h4>
                        <span className="text-[8px] font-bold text-neutral-400 mt-0.5">
                          {movie.duration} • {movie.year}
                        </span>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>

            {/* Shelf: Nouveaux épisodes */}
            {movies.some(
              (m) => m.id === "seed-lupin" || m.id === "seed-tlou",
            ) && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  📅 Nouveaux épisodes cette semaine
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Lupin S3 new ep visual card */}
                  {movies.some((m) => m.id === "seed-lupin") && (
                    <div
                      onClick={() => {
                        const item = movies.find((m) => m.id === "seed-lupin");
                        if (item) setSelectedMovie(item);
                      }}
                      className="bg-white/[0.02] border border-white/[0.05] hover:border-[#E50914]/40 rounded-md p-5 flex gap-4 cursor-pointer transform hover:scale-[1.01] transition-all bg-gradient-to-r from-neutral-900/60"
                    >
                      <img
                        src="https://images.unsplash.com/photo-1522083165195-342750297f46?q=80&w=400"
                        className="w-[120px] aspect-video object-cover rounded border border-white/5 shadow"
                      />
                      <div className="flex-1 flex flex-col justify-center min-w-0">
                        <span className="text-[8px] font-black uppercase tracking-wider text-[#E50914]">
                          Nouveau de Lupin
                        </span>
                        <h4 className="text-xs font-black text-white uppercase truncate mt-0.5">
                          Saison 3, Épisode 1 : Le retour d'Arsène
                        </h4>
                        <p className="text-[10px] text-neutral-400 mt-1 line-clamp-2">
                          Assane conçoit une infiltration audacieuse pour
                          dérober le plus précieux trésor de France.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* The Last of Us S1 ep3 card */}
                  {movies.some((m) => m.id === "seed-tlou") && (
                    <div
                      onClick={() => {
                        const item = movies.find((m) => m.id === "seed-tlou");
                        if (item) setSelectedMovie(item);
                      }}
                      className="bg-white/[0.02] border border-white/[0.05] hover:border-[#E50914]/40 rounded-md p-5 flex gap-4 cursor-pointer transform hover:scale-[1.01] transition-all bg-gradient-to-r from-neutral-900/60"
                    >
                      <img
                        src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=400"
                        className="w-[120px] aspect-video object-cover rounded border border-white/5 shadow"
                      />
                      <div className="flex-1 flex flex-col justify-center min-w-0">
                        <span className="text-[8px] font-black uppercase tracking-wider text-[#E50914]">
                          Nouveau de The Last of Us
                        </span>
                        <h4 className="text-xs font-black text-white uppercase truncate mt-0.5">
                          Saison 1, Épisode 3 : Long, Long Time
                        </h4>
                        <p className="text-[10px] text-neutral-400 mt-1 line-clamp-2">
                          Plongez dans l'un des plus touchants épisodes de
                          survie jamais racontés à la télévision.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Shelf: Séries françaises */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                🇫🇷 Productions Françaises Majeures
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
                {filterBySection("series", "french").map((movie) => (
                  <motion.div
                    key={`series-fr-${movie.id}`}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="relative aspect-[2/3] rounded-md overflow-hidden cursor-pointer group border border-white/[0.05] bg-neutral-900"
                    onClick={() => setSelectedMovie(movie)}
                  >
                    <img
                      src={movie.poster}
                      className="w-full h-full object-cover transition-all"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent opacity-95 p-3 flex flex-col justify-end">
                      <h4 className="text-[10px] sm:text-xs font-black text-white uppercase truncate group-hover:text-[#E50914]">
                        {movie.title}
                      </h4>
                      <span className="text-[8px] font-bold text-neutral-400 mt-0.5">
                        {movie.duration}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Shelf: Séries internationales */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                🌎 Séries Internationales
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
                {filterBySection("series", "intl").map((movie) => (
                  <motion.div
                    key={`series-intl-${movie.id}`}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="relative aspect-[2/3] rounded-md overflow-hidden cursor-pointer group border border-white/[0.05] bg-neutral-900"
                    onClick={() => setSelectedMovie(movie)}
                  >
                    <img
                      src={movie.poster}
                      className="w-full h-full object-cover transition-all"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent opacity-95 p-3 flex flex-col justify-end">
                      <h4 className="text-[10px] sm:text-xs font-black text-white uppercase truncate group-hover:text-[#E50914]">
                        {movie.title}
                      </h4>
                      <span className="text-[8px] font-bold text-neutral-400 mt-0.5">
                        {movie.duration}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================================= 
            TAB: RECHERCHE (Cinematic view)
           ================================= */}
        {currentTab === "search" && (
          <div className="px-6 sm:px-12 space-y-8 max-w-5xl mx-auto">
            <div className="space-y-4 text-center pb-6">
              <h1 className="text-3xl font-sans font-black tracking-tight uppercase text-white">
                Recherche
              </h1>
              <p className="text-white/40 text-xs uppercase tracking-widest font-extrabold max-w-sm mx-auto">
                Saisissez un film, un réalisateur, un acteur ou un genre
              </p>
            </div>

            {/* Glowing input bar */}
            <div className="relative group max-w-xl mx-auto">
              <div className="absolute inset-0 bg-[#E50914]/5 rounded-[24px] blur-xl group-focus-within:opacity-100 opacity-0 transition-opacity duration-300 pointer-events-none" />
              <Search
                className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#E50914] transition-colors"
                size={22}
              />

              <input
                type="text"
                placeholder="Ex: Oppenheimer, Christopher Nolan, Zendaya..."
                className="w-full bg-black/50 border border-white/10 hover:border-white/20 focus:border-[#E50914]/50 rounded-2xl py-4.5 pl-14 pr-16 text-white outline-none focus:ring-2 focus:ring-[#E50914]/20 transition-all text-base sm:text-lg font-bold placeholder:text-white/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddSearchHistory(searchQuery);
                  }
                }}
                id="search-input-field"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/5 hover:bg-white/15 hover:text-white text-white/45 rounded-full transition-all cursor-pointer"
                  id="clear-search-btn"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Suggestions pill blocks */}
            {searchSuggestions.length > 0 && (
              <div className="max-w-xl mx-auto flex flex-wrap items-center gap-2 justify-center">
                <span className="text-[9px] font-black uppercase text-white/20 mr-1.5">
                  Suggestions :
                </span>
                {searchSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSearchQuery(s);
                      handleAddSearchHistory(s);
                    }}
                    className="px-3 py-1.5 bg-white/[0.02] border border-white/5 rounded-full text-[9px] font-extrabold uppercase hover:border-[#E50914]/40 text-white/60 hover:text-white"
                    id={`suggestion-pill-${s}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Search History Tags */}
            {searchHistory.length > 0 && !searchQuery && (
              <div className="max-w-xl mx-auto bg-white/[0.01] border border-white/[0.04] p-5 rounded-md space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
                  <span className="text-[10px] font-black uppercase text-white/30 tracking-wider">
                    Historique récent
                  </span>
                  <button
                    onClick={handleClearHistory}
                    className="text-[9px] font-black uppercase text-[#E50914] hover:text-red-500"
                  >
                    Effacer
                  </button>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {searchHistory.map((term, index) => (
                    <button
                      key={index}
                      onClick={() => setSearchQuery(term)}
                      className="flex items-center gap-1.5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] rounded-md px-3 py-2 text-[10px] font-extrabold uppercase text-white/75"
                      id={`history-term-${index}`}
                    >
                      <Clock size={10} className="text-white/30" />
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick actor search list */}
            {!searchQuery && (
              <div className="space-y-4 max-w-xl mx-auto">
                <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">
                  Recherche populaire par acteur
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {["Zendaya", "Pedro Pascal", "Omar Sy", "Cillian Murphy"].map(
                    (actor) => (
                      <button
                        key={actor}
                        onClick={() => {
                          setSearchQuery(actor);
                          handleAddSearchHistory(actor);
                        }}
                        className="flex items-center gap-3 bg-white/[0.02] hover:bg-[#E50914]/10 hover:border-[#E50914]/30 border border-white/5 p-3.5 rounded-md text-left transition-all"
                        id={`actor-bubble-${actor}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center text-xs font-black uppercase text-[#E50914]">
                          {actor.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-black uppercase tracking-wider block text-white/80">
                            {actor}
                          </span>
                          <span className="text-[8px] font-semibold text-neutral-400 uppercase tracking-wide">
                            Casting star
                          </span>
                        </div>
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* Search results shelves */}
            {searchQuery && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                  Résultats de votre recherche ({searchResults.length})
                </h3>

                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
                    {searchResults.map((movie) => (
                      <motion.div
                        key={`search-res-${movie.id}`}
                        whileHover={{ scale: 1.05, y: -5 }}
                        className="relative aspect-[2/3] rounded-md overflow-hidden cursor-pointer group border border-white/[0.05] bg-neutral-900"
                        onClick={() => setSelectedMovie(movie)}
                      >
                        <img
                          src={movie.poster}
                          className="w-full h-full object-cover transition-all"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent opacity-95 p-3 flex flex-col justify-end">
                          <h4 className="text-[10px] sm:text-xs font-black text-white uppercase truncate group-hover:text-[#E50914]">
                            {movie.title}
                          </h4>
                          <span className="text-[8px] font-bold text-neutral-400 mt-0.5">
                            {movie.year} • {movie.duration}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-10 text-center space-y-3">
                    <HelpCircle size={32} className="text-white/20 mx-auto" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">
                      Aucun contenu trouvé
                    </h4>
                    <p className="text-[10px] text-neutral-400 max-w-xs mx-auto">
                      Veuillez vérifier l'orthographe ou essayer avec un autre
                      mot-clé de genre ou de casting.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================================= 
            TAB: MA LISTE 
           ================================= */}
        {currentTab === "mylist" && (
          <div className="px-6 sm:px-12 space-y-10">
            <div>
              <h1 className="text-2xl sm:text-3xl font-sans font-black tracking-tight flex items-center gap-2 uppercase">
                <Heart className="text-red-500 fill-current" size={26} />
                MA SÉLECTION VIDÉO
              </h1>
              <p className="text-white/40 text-[9px] uppercase tracking-wider font-extrabold mt-1">
                Retrouvez ici tous vos contenus sauvegardés (
                {mySavedMovies.length} titres)
              </p>
            </div>

            {mySavedMovies.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
                {mySavedMovies.map((movie) => (
                  <motion.div
                    key={`mylist-movie-${movie.id}`}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="relative aspect-[2/3] rounded-md overflow-hidden cursor-pointer group border border-white/[0.05] bg-neutral-900"
                    onClick={() => setSelectedMovie(movie)}
                  >
                    <img
                      src={movie.poster}
                      className="w-full h-full object-cover transition-all"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent opacity-95 p-3 flex flex-col justify-end">
                      <h4 className="text-[10px] sm:text-xs font-black text-white uppercase truncate group-hover:text-[#E50914]">
                        {movie.title}
                      </h4>
                      <span className="text-[8px] font-bold text-neutral-400 mt-0.5">
                        {movie.year}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleToggleMyList(movie.id, e)}
                      className="absolute top-2.5 right-2.5 p-2 bg-black/50 hover:bg-[#E50914] rounded-full text-white transition-all backdrop-blur-md"
                      title="Retirer de ma liste"
                      id={`mylist-remove-${movie.id}`}
                    >
                      <X size={12} />
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="h-[40vh] flex flex-col items-center justify-center text-center px-6 border-2 border-dashed border-white/5 rounded-md max-w-md mx-auto">
                <Heart size={32} className="text-white/10 mb-3" />
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  Votre liste est vide
                </h4>
                <p className="text-[10px] text-neutral-400 leading-relaxed mt-1">
                  Parcourez notre catalogue et cliquez sur le bouton "+ Ma
                  liste" des films ou séries vedettes pour les épingler ici.
                </p>
                <button
                  onClick={() => setCurrentTab("accueil")}
                  className="mt-5 px-5 py-2.5 bg-[#E50914] hover:bg-[#b80710] text-white font-black text-[10px] uppercase tracking-wider rounded-md transition-colors"
                  id="mylist-back-to-home"
                >
                  Découvrir le catalogue
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DETAILED HIGH-FIDELITY DETAILS MODAL - Netflix/VIP Cinematic slide overlay */}
      <AnimatePresence>
        {selectedMovie && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-10 select-none overflow-hidden"
          >
            {/* Blurry cinematic background */}
            <div
              className="absolute inset-0 bg-black/92 backdrop-blur-xl"
              onClick={() => setSelectedMovie(null)}
            />

            <motion.div
              layoutId={`movie-${selectedMovie.id}`}
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="bg-[#0b0b0b] w-full max-w-5xl max-h-[95vh] rounded-md overflow-y-auto relative shadow-2xl border border-white/[0.08] scrollbar-hide flex flex-col"
            >
              {/* Close Button float */}
              <button
                onClick={() => setSelectedMovie(null)}
                className="absolute top-5 right-5 z-50 p-3 bg-black/60 hover:bg-[#E50914] rounded-full text-white/80 hover:text-white transition-all border border-white/10 active:scale-95"
                id="modal-close-button"
              >
                <X size={16} />
              </button>

              {/* Wide cinematic banner */}
              <div className="relative h-[220px] sm:h-[420px] w-full shrink-0">
                <img
                  src={selectedMovie.banner || selectedMovie.poster}
                  alt={selectedMovie.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b]/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0b0b0b] to-transparent" />

                {/* Info Overlay */}
                <div className="absolute bottom-0 left-0 p-5 sm:p-10 w-full flex flex-col md:flex-row md:items-end justify-between gap-5 z-10">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase">
                      <span className="text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-md flex items-center gap-1">
                        <Star
                          size={10}
                          className="fill-current text-yellow-400"
                        />{" "}
                        {selectedMovie.ratingImdb || "8.2"} IMDB
                      </span>
                      <span className="text-white/60 bg-white/5 border border-white/10 px-2.5 py-1 rounded-md">
                        {selectedMovie.year}
                      </span>
                      <span className="text-white/60 bg-white/5 border border-white/10 px-2.5 py-1 rounded-md">
                        {selectedMovie.duration}
                      </span>
                      <span className="border border-[#E50914]/30 text-[#E50914] bg-[#E50914]/10 px-2.5 py-1 rounded-md">
                        {selectedMovie.quality}
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-3xl md:text-4xl font-sans font-black tracking-tight leading-tight uppercase drop-shadow">
                      {selectedMovie.title}
                    </h2>

                    {selectedMovie.originalTitle && (
                      <span className="text-white/40 text-[9px] font-black uppercase tracking-wider block">
                        Titre original : {selectedMovie.originalTitle}
                      </span>
                    )}
                  </div>

                  {/* Immediate Actions */}
                  <div className="flex gap-2 w-full md:w-auto font-sans">
                    <button
                      className="flex-1 md:flex-none bg-[#E50914] hover:bg-[#b80710] text-white px-6 py-3 rounded-md font-black flex items-center justify-center gap-2.5 transition-all text-[10px] uppercase tracking-wider"
                      onClick={() => {
                        handleLaunchItem(selectedMovie);
                        setSelectedMovie(null);
                      }}
                      id="modal-play-btn"
                    >
                      <Play size={13} fill="currentColor" /> Regarder maintenant
                    </button>
                    <button
                      onClick={() => handleToggleMyList(selectedMovie.id)}
                      className={cn(
                        "flex-1 md:flex-none px-5 py-3 rounded-md font-black flex items-center justify-center gap-2 transition-all text-[10px] uppercase tracking-wider",
                        myList.includes(selectedMovie.id)
                          ? "bg-emerald-600/20 border border-emerald-500/30 text-emerald-400"
                          : "bg-white/5 hover:bg-white/10 border border-white/10 text-white",
                      )}
                      id="modal-mylist-btn"
                    >
                      {myList.includes(selectedMovie.id) ? (
                        <>
                          <Check size={14} /> Ma Liste
                        </>
                      ) : (
                        <>
                          <Plus size={14} /> Ma Liste
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Content body layout */}
              <div className="p-5 sm:p-10 pt-2 pb-12 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column (synopsis, cast) */}
                  <div className="lg:col-span-2 space-y-8">
                    {/* Synopsis summary */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase text-[#E50914] tracking-wider">
                        Synopsis
                      </span>
                      <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-medium">
                        {selectedMovie.summary ||
                          "Aucun synopsis disponible pour ce titre."}
                      </p>
                    </div>

                    {/* Metadata specs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/[0.02] border border-white/[0.05] rounded-md p-4">
                      <div>
                        <span className="text-[9px] font-black uppercase text-white/30 tracking-wider block">
                          Réalisateur
                        </span>
                        <span className="text-xs font-bold text-white/80">
                          {selectedMovie.director || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase text-white/30 tracking-wider block">
                          Pays
                        </span>
                        <span className="text-xs font-bold text-white/80">
                          {selectedMovie.country || "France"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase text-white/30 tracking-wider block">
                          Langue
                        </span>
                        <span className="text-xs font-bold text-white/80">
                          {selectedMovie.language || "Français"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase text-white/30 tracking-wider block font-black">
                          Classification
                        </span>
                        <span className="text-xs font-bold text-emerald-400 uppercase">
                          Tout Public
                        </span>
                      </div>
                    </div>

                    {/* Cast members bubbles */}
                    {selectedMovie.actors &&
                      selectedMovie.actors.length > 0 && (
                        <div className="space-y-3">
                          <span className="text-[9px] font-black uppercase text-white/30 tracking-widest block">
                            Casting Principal
                          </span>
                          <div className="flex flex-wrap gap-2.5">
                            {selectedMovie.actors.map((actor, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 bg-white/[0.03] border border-white/5 pl-2.5 pr-3 py-1.5 rounded-full"
                              >
                                <div className="w-5 h-5 rounded-full bg-[#E50914]/15 border border-[#E50914]/20 flex items-center justify-center text-[#E50914] font-bold text-[9px] uppercase">
                                  {actor.charAt(0)}
                                </div>
                                <span className="text-[10px] font-bold text-white/80">
                                  {actor}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* INTERACTIVE TV SERIES SEASONS & EPISODES SHELF */}
                    {seasonsData.length > 0 && (
                      <div className="space-y-4 pt-4 border-t border-white/[0.04]">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <span className="text-[10px] font-black uppercase text-[#E50914] tracking-wider flex items-center gap-1.5">
                            <Layers size={13} /> Saisons & Épisodes (
                            {seasonsData.length})
                          </span>

                          {/* Season selector triggers */}
                          <div className="flex gap-1.5">
                            {seasonsData.map((item) => (
                              <button
                                key={item.seasonNumber}
                                onClick={() =>
                                  setActiveSeason(item.seasonNumber)
                                }
                                className={cn(
                                  "px-3.5 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider border",
                                  activeSeason === item.seasonNumber
                                    ? "bg-[#E50914] text-white border-transparent"
                                    : "bg-white/[0.02] text-white/50 border-white/5 hover:border-white/10",
                                )}
                                id={`season-selector-${item.seasonNumber}`}
                              >
                                Saison {item.seasonNumber}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* List of episodes grid with thumbnail image */}
                        <div className="grid grid-cols-1 gap-3.5">
                          {currentEpisodes.map((ep) => (
                            <div
                              key={ep.id}
                              onClick={() => {
                                // Create episode movie replica for instant player rendering
                                const epMovie: Movie = {
                                  ...selectedMovie,
                                  id: ep.id,
                                  title: `${selectedMovie.title} - S${activeSeason}E${ep.episodeNumber} : ${ep.title}`,
                                  duration: ep.duration,
                                  videoUrl: ep.videoUrl,
                                  summary: ep.summary,
                                };
                                handleLaunchItem(epMovie);
                                setSelectedMovie(null);
                              }}
                              className="group bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.05] rounded-md p-3 flex gap-4 cursor-pointer transform hover:scale-[1.005] transition-all"
                            >
                              <div className="w-[100px] sm:w-[130px] aspect-video object-cover rounded-md overflow-hidden shrink-0 border border-white/5 relative">
                                <img
                                  src={ep.thumbnail || selectedMovie.poster}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Play
                                    size={14}
                                    fill="currentColor"
                                    className="text-white"
                                  />
                                </div>
                              </div>
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-1 text-[8px] font-bold text-neutral-400 uppercase">
                                  <span>Épisode {ep.episodeNumber}</span>
                                  <span>•</span>
                                  <span>{ep.duration}</span>
                                </div>
                                <h4 className="text-xs font-black text-white uppercase truncate mt-0.5 group-hover:text-[#E50914] transition-colors">
                                  {ep.title}
                                </h4>
                                <p className="text-[10px] text-neutral-400 line-clamp-2 mt-1 leading-relaxed">
                                  {ep.summary}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column (embedded trailer) */}
                  <div className="space-y-6">
                    <div className="bg-white/[0.01] border border-white/[0.05] rounded-md p-5 space-y-3.5">
                      <span className="text-[9px] font-black uppercase text-[#E50914] tracking-wider flex items-center gap-1">
                        <Play size={10} fill="currentColor" /> Bande-annonce
                        officielle
                      </span>

                      {selectedMovie.trailerUrl ? (
                        <div className="aspect-video bg-black rounded-md overflow-hidden border border-white/10 relative group shadow">
                          <img
                            src={
                              selectedMovie.trailerUrl.includes("v=")
                                ? `https://img.youtube.com/vi/${selectedMovie.trailerUrl.split("v=")[1]}/hqdefault.jpg`
                                : selectedMovie.poster
                            }
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-all scale-102"
                            alt="trailer thumb"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <button
                              onClick={() => {
                                try {
                                  window.open(
                                    selectedMovie!.trailerUrl,
                                    "_blank",
                                  );
                                } catch (e) {}
                              }}
                              className="p-3 bg-[#E50914] rounded-full text-white pointer-events-auto transform group-hover:scale-110 shadow-lg shadow-[#E50914]/30 transition-transform"
                              id="view-trailer-btn"
                            >
                              <Play size={16} fill="currentColor" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-video bg-white/[0.02] border-2 border-white/5 border-dashed rounded-md flex flex-col items-center justify-center text-center">
                          <span className="text-[9px] font-black uppercase text-white/20">
                            Bande-annonce non disponible
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Genres associated lists */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase text-white/30 tracking-widest block">
                        Genres associés
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {selectedMovie.genres.map((g, i) => (
                          <span
                            key={i}
                            className="text-[9px] font-black uppercase text-[#E50914] bg-[#E50914]/10 px-3 py-1.5 rounded-md border border-[#E50914]/20"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
