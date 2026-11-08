
import { NextRequest, NextResponse } from "next/server";
import type { Topic } from "@/lib/types";

const WIKI_PAGE_SIZE = 50;
const NASA_PAGE_SIZE = 50;

const categorySearches: Record<string, string> = {
  All: "science OR history OR technology OR nature OR discoveries",
  Science: "science OR physics OR biology OR chemistry",
  Technology: "artificial intelligence OR robotics OR computer technology",
  History: "world history OR ancient civilizations OR historical events",
  Space: "astronomy OR planets OR universe OR space exploration",
  Nature: "wildlife OR biodiversity OR ecosystems OR natural wonders",
  Psychology: "psychology OR human brain OR behavior OR neuroscience",
  Geography: "geography OR oceans OR countries OR mountains OR earth",
};

function categoryFor(category: string) {
  return category === "All" ? "Discovery" : category;
}

async function fetchWikipedia(
  searchTerm: string,
  offset: number,
  category: string
): Promise<{
  topics: Topic[];
  hasMore: boolean;
}> {
  const searchUrl = new URL("https://en.wikipedia.org/w/api.php");

  searchUrl.searchParams.set("action", "query");
  searchUrl.searchParams.set("list", "search");
  searchUrl.searchParams.set("srsearch", searchTerm);
  searchUrl.searchParams.set("srlimit", String(WIKI_PAGE_SIZE));
  searchUrl.searchParams.set("sroffset", String(offset));
  searchUrl.searchParams.set("srnamespace", "0");
  searchUrl.searchParams.set("format", "json");
  searchUrl.searchParams.set("formatversion", "2");

  const searchResponse = await fetch(searchUrl.toString(), {
    headers: {
      "User-Agent": "RapidLearn/1.0 (educational hobby project)",
    },
    next: { revalidate: 3600 },
  });

  if (!searchResponse.ok) {
    throw new Error(`Wikipedia search failed: ${searchResponse.status}`);
  }

  const searchData = await searchResponse.json();

  const results = searchData.query?.search || [];
  const totalHits = Number(searchData.query?.searchinfo?.totalhits || 0);

  if (results.length === 0) {
    return {
      topics: [],
      hasMore: false,
    };
  }

  const pageIds = results
    .map((item: any) => item.pageid)
    .filter(Boolean)
    .join("|");

  const detailsUrl = new URL("https://en.wikipedia.org/w/api.php");

  detailsUrl.searchParams.set("action", "query");
  detailsUrl.searchParams.set("pageids", pageIds);
  detailsUrl.searchParams.set("prop", "extracts|pageimages|info");
  detailsUrl.searchParams.set("exintro", "1");
  detailsUrl.searchParams.set("explaintext", "1");
  detailsUrl.searchParams.set("exchars", "1200");
  detailsUrl.searchParams.set("piprop", "thumbnail");
  detailsUrl.searchParams.set("pithumbsize", "900");
  detailsUrl.searchParams.set("inprop", "url");
  detailsUrl.searchParams.set("format", "json");
  detailsUrl.searchParams.set("formatversion", "2");

  const detailsResponse = await fetch(detailsUrl.toString(), {
    headers: {
      "User-Agent": "RapidLearn/1.0 (educational hobby project)",
    },
    next: { revalidate: 3600 },
  });

  if (!detailsResponse.ok) {
    throw new Error(`Wikipedia details failed: ${detailsResponse.status}`);
  }

  const detailsData = await detailsResponse.json();

  const pages = detailsData.query?.pages || [];

  const topics: Topic[] = pages
    .filter(
      (item: any) =>
        item.extract &&
        String(item.extract).trim().length > 50
    )
    .map((item: any) => ({
      id: `wiki-${item.pageid}`,
      title: String(item.title),
      description: String(item.extract),
      image: item.thumbnail?.source || null,
      category: categoryFor(category),
      source: "Wikipedia",
      url:
        item.fullurl ||
        `https://en.wikipedia.org/wiki/${encodeURIComponent(
          String(item.title).replace(/ /g, "_")
        )}`,
    }));

  return {
    topics,
    hasMore: offset + results.length < totalHits,
  };
}

async function fetchNASA(
  searchTerm: string,
  page: number
): Promise<{
  topics: Topic[];
  hasMore: boolean;
}> {
  const nasaUrl = new URL("https://images-api.nasa.gov/search");

  nasaUrl.searchParams.set("q", searchTerm);
  nasaUrl.searchParams.set("media_type", "image");
  nasaUrl.searchParams.set("page", String(page));
  nasaUrl.searchParams.set("page_size", String(NASA_PAGE_SIZE));

  const response = await fetch(nasaUrl.toString(), {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`NASA request failed: ${response.status}`);
  }

  const data = await response.json();

  const collection = data.collection;
  const items = collection?.items || [];

  const totalHits = Number(collection?.metadata?.total_hits || 0);

  const topics: Topic[] = items
    .map((item: any) => {
      const metadata = item.data?.[0];

      const image = item.links?.find(
        (link: any) => link.rel === "preview"
      )?.href;

      if (!metadata || !image || !metadata.nasa_id) {
        return null;
      }

      const nasaId = metadata.nasa_id;

      return {
        id: `nasa-${nasaId}`,
        title: metadata.title || "NASA Discovery",
        description:
          String(metadata.description || "").slice(0, 1200) ||
          "Explore an image from NASA's space and science collection.",
        image,
        category: "Space",
        source: "NASA",
        url: `https://images.nasa.gov/details/${nasaId}`,
      } satisfies Topic;
    })
    .filter(Boolean) as Topic[];

  return {
    topics,
    hasMore: page * NASA_PAGE_SIZE < totalHits,
  };
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const category = params.get("category") || "All";
    const search = params.get("q")?.trim() || "";
    const page = Math.max(1, Number(params.get("page")) || 1);

    const searchTerm =
      search || categorySearches[category] || categorySearches.All;

    const wikiOffset = (page - 1) * WIKI_PAGE_SIZE;

    // Fetch Wikipedia and NASA concurrently.
    const wikiPromise = fetchWikipedia(
      searchTerm,
      wikiOffset,
      category
    ).catch((error) => {
      console.error("Wikipedia API error:", error);

      return {
        topics: [] as Topic[],
        hasMore: false,
      };
    });

    const shouldFetchNASA =
      category === "All" || category === "Space";

    const nasaSearchTerm =
      category === "Space"
        ? search || "astronomy planets universe space exploration"
        : search || "astronomy space planets galaxies universe";

    const nasaPromise = shouldFetchNASA
      ? fetchNASA(nasaSearchTerm, page).catch((error) => {
          console.error("NASA API error:", error);

          return {
            topics: [] as Topic[],
            hasMore: false,
          };
        })
      : Promise.resolve({
          topics: [] as Topic[],
          hasMore: false,
        });

    const [wikiResult, nasaResult] = await Promise.all([
      wikiPromise,
      nasaPromise,
    ]);

    // Merge results. Deduplicate only identical source IDs.
    const combined = [
      ...nasaResult.topics,
      ...wikiResult.topics,
    ];

    const uniqueTopics = Array.from(
      new Map(
        combined.map((topic) => [topic.id, topic])
      ).values()
    );

    return NextResponse.json({
      topics: uniqueTopics,
      count: uniqueTopics.length,
      page,
      pageSize: WIKI_PAGE_SIZE + (
        shouldFetchNASA ? NASA_PAGE_SIZE : 0
      ),
      hasMore: wikiResult.hasMore || nasaResult.hasMore,
      sources: {
        wikipedia: wikiResult.topics.length,
        nasa: nasaResult.topics.length,
      },
      pagination: {
        wikipediaHasMore: wikiResult.hasMore,
        nasaHasMore: nasaResult.hasMore,
      },
    });
  } catch (error) {
    console.error("Topics API error:", error);

    return NextResponse.json(
      {
        error: "Unable to load topics. Please try again.",
        topics: [],
        hasMore: false,
      },
      { status: 500 }
    );
  }
}
