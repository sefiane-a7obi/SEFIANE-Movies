import urllib.request
import json
import sys

API_KEY = 'c9e7c891bf8bbb53ee3d259c8312a093'
BASE_URL = 'https://api.themoviedb.org/3'

print("=== ZENITH TV API CONNECTIVITY & DATA VALIDATION ===")

def check_endpoint(name, url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            results_len = len(data.get('results', data.get('data', [])))
            print(f"[OK] {name}: SUCCESS. Loaded {results_len} items.")
            return data
    except Exception as e:
        print(f"[FAIL] {name}: FAILED. Error: {e}")
        return None

# 1. Test TMDB Trending Movies & TV
check_endpoint("TMDB Trending", f"{BASE_URL}/trending/all/day?api_key={API_KEY}&language=ar-SA")

# 2. Test TMDB Popular Movies
check_endpoint("TMDB Popular Movies", f"{BASE_URL}/movie/popular?api_key={API_KEY}&language=ar-SA&page=1")

# 3. Test TMDB Popular TV
check_endpoint("TMDB Popular TV", f"{BASE_URL}/tv/popular?api_key={API_KEY}&language=ar-SA&page=1")

# 4. Test Jikan Top Anime
check_endpoint("Jikan Top Anime", "https://api.jikan.moe/v4/top/anime?filter=bypopularity&limit=15")

# 5. Test TMDB Search Multi (e.g. searching for 'Marvel')
check_endpoint("TMDB Search Multi", f"{BASE_URL}/search/multi?api_key={API_KEY}&query=Marvel&language=ar-SA")

# 6. Test Jikan Search Anime (e.g. searching for 'Marvel')
check_endpoint("Jikan Search Anime", "https://api.jikan.moe/v4/anime?q=Marvel&limit=10")

# 7. Test TMDB Movie Details (e.g. Movie ID 550 - Fight Club)
try:
    url = f"{BASE_URL}/movie/550?api_key={API_KEY}&language=ar-SA&append_to_response=videos,credits,similar"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        print(f"[OK] TMDB Movie Details: SUCCESS. Movie title retrieved.")
except Exception as e:
    print(f"[FAIL] TMDB Movie Details: FAILED. Error: {e}")

# 8. Test Jikan Anime Details (e.g. Anime ID 20 - Naruto)
try:
    url = "https://api.jikan.moe/v4/anime/20/full"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        print(f"[OK] Jikan Anime Details: SUCCESS. Anime title retrieved.")
except Exception as e:
    print(f"[FAIL] Jikan Anime Details: FAILED. Error: {e}")
