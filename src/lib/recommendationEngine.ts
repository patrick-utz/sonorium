/**
 * Recommendation Engine - AI-based album recommendations based on collection similarity
 */

import { Record } from "@/types/record";

export interface Recommendation {
  album: string;
  artist: string;
  year?: number;
  reason: string;
  score: number;
  genre: string[];
}

/**
 * Calculate genre preferences from collection
 */
function getGenrePreferences(
  records: Record[]
): Map<string, number> {
  const genreScores = new Map<string, number>();

  records.forEach((record) => {
    record.genre.forEach((genre) => {
      genreScores.set(genre, (genreScores.get(genre) || 0) + 1);
    });
  });

  return genreScores;
}

/**
 * Calculate artist preferences from collection
 */
function getArtistPreferences(
  records: Record[]
): Map<string, { count: number; avgRating: number }> {
  const artistData = new Map<string, { count: number; ratings: number[] }>();

  records.forEach((record) => {
    const data = artistData.get(record.artist) || { count: 0, ratings: [] };
    data.count += 1;
    if (record.myRating) {
      data.ratings.push(record.myRating);
    }
    artistData.set(record.artist, data);
  });

  // Convert to avgRating
  const result = new Map<string, { count: number; avgRating: number }>();
  artistData.forEach((data, artist) => {
    const avgRating =
      data.ratings.length > 0
        ? data.ratings.reduce((a, b) => a + b) / data.ratings.length
        : 0;
    result.set(artist, { count: data.count, avgRating });
  });

  return result;
}

/**
 * Score a potential recommendation
 */
function scoreRecommendation(
  album: Record,
  userGenrePrefs: Map<string, number>,
  userArtistPrefs: Map<string, { count: number; avgRating: number }>,
  ownedAlbums: Set<string>
): number {
  // Don't recommend albums user already owns
  if (
    ownedAlbums.has(`${album.artist}|${album.album}`)
  ) {
    return -1;
  }

  let score = 0;

  // Genre match (0-40 points)
  const totalGenreCount = Array.from(userGenrePrefs.values()).reduce(
    (a, b) => a + b,
    0
  );
  album.genre.forEach((genre) => {
    const genreCount = userGenrePrefs.get(genre) || 0;
    const genreFrequency = genreCount / totalGenreCount;
    score += genreFrequency * 40;
  });

  // Artist match (0-35 points)
  const artistData = userArtistPrefs.get(album.artist);
  if (artistData) {
    score += Math.min(artistData.count * 5, 35); // Up to 35 points for liking artist
    if (artistData.avgRating >= 4) {
      score += 10; // Bonus for highly-rated artist
    }
  }

  // Quality scoring (0-15 points)
  if (album.criticScore && album.criticScore >= 80) {
    score += 15;
  } else if (album.criticScore && album.criticScore >= 70) {
    score += 10;
  } else if (album.criticScore) {
    score += 5;
  }

  // Format preference (0-10 points) - recommend vinyl if user has many
  // Format preference would go here

  return score;
}

/**
 * Generate recommendations based on user collection
 */
export function generateRecommendations(
  userCollection: Record[],
  candidateCollection: Record[]
): Recommendation[] {
  if (userCollection.length === 0 || candidateCollection.length === 0) {
    return [];
  }

  const genrePrefs = getGenrePreferences(userCollection);
  const artistPrefs = getArtistPreferences(userCollection);
  const ownedAlbums = new Set(
    userCollection.map((r) => `${r.artist}|${r.album}`)
  );

  // Score all candidates
  const scoredAlbums = candidateCollection
    .map((album) => ({
      album,
      score: scoreRecommendation(album, genrePrefs, artistPrefs, ownedAlbums),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10); // Top 10 recommendations

  // Convert to recommendations with reasons
  return scoredAlbums.map(({ album, score }) => {
    let reason = "";

    const matchingGenres = album.genre.filter(
      (g) => genrePrefs.has(g) && genrePrefs.get(g)! > 0
    );

    if (matchingGenres.length > 0) {
      reason = `Du liebst ${matchingGenres.join(" & ")}`;
    }

    const artistData = artistPrefs.get(album.artist);
    if (artistData && artistData.count >= 3) {
      reason = `Ähnlich wie deine anderen Alben von ${album.artist}`;
    }

    if (!reason) {
      reason = "Basierend auf deinem Geschmack";
    }

    return {
      album: album.album,
      artist: album.artist,
      year: album.year,
      reason,
      score: Math.round(score),
      genre: album.genre,
    };
  });
}

/**
 * Get recommendations from a friend's collection
 */
export function getFriendRecommendations(
  userCollection: Record[],
  friendCollection: Record[]
): Recommendation[] {
  const friendAlbumsNotOwned = friendCollection.filter(
    (friendAlbum) =>
      !userCollection.some(
        (userAlbum) =>
          userAlbum.artist === friendAlbum.artist &&
          userAlbum.album === friendAlbum.album
      )
  );

  return generateRecommendations(userCollection, friendAlbumsNotOwned);
}

/**
 * Find mutual albums between two collections
 */
export function findMutualAlbums(
  collection1: Record[],
  collection2: Record[]
): Record[] {
  return collection1.filter((album1) =>
    collection2.some(
      (album2) =>
        album1.artist === album2.artist && album1.album === album2.album
    )
  );
}

/**
 * Find albums one collection has that the other doesn't
 */
export function findMissingAlbums(
  collection: Record[],
  otherCollection: Record[]
): Record[] {
  return otherCollection.filter(
    (album) =>
      !collection.some(
        (userAlbum) =>
          userAlbum.artist === album.artist && userAlbum.album === album.album
      )
  );
}

/**
 * Get collection statistics for display
 */
export interface CollectionStats {
  totalAlbums: number;
  totalArtists: number;
  topGenres: Array<{ genre: string; count: number }>;
  avgRating: number;
  formats: { vinyl: number; cd: number; other: number };
}

export function getCollectionStats(collection: Record[]): CollectionStats {
  const artists = new Set(collection.map((r) => r.artist));
  const genreMap = new Map<string, number>();
  let totalRating = 0;
  let ratedAlbums = 0;
  let vinyl = 0;
  let cd = 0;
  let other = 0;

  collection.forEach((record) => {
    // Genres
    record.genre.forEach((genre) => {
      genreMap.set(genre, (genreMap.get(genre) || 0) + 1);
    });

    // Ratings
    if (record.myRating) {
      totalRating += record.myRating;
      ratedAlbums += 1;
    }

    // Formats
    if (record.format === "vinyl") {
      vinyl += 1;
    } else if (record.format === "cd") {
      cd += 1;
    } else {
      other += 1;
    }
  });

  const topGenres = Array.from(genreMap.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalAlbums: collection.length,
    totalArtists: artists.size,
    topGenres,
    avgRating: ratedAlbums > 0 ? totalRating / ratedAlbums : 0,
    formats: { vinyl, cd, other },
  };
}
