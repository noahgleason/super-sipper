// Disney's Typhoon Lagoon: lands, drink spots and the starter menu (Walt Disney World).
// Generated from TouringPlans' park menus (verified Sept 2026) and OpenStreetMap positions.
// The app replaces this with a fresher menu whenever someone runs this park's prompt or research.
// Drink tuple: [name, price, type, description]

export const CHECKED = "2026-09-25";
export const SOURCES = ["https://touringplans.com/typhoon-lagoon/dining"];

export const LANDS = {
  "tl-getaway-glen": {"name": "Getaway Glen", "short": "Getaway Glen", "lat": 28.36488, "lng": -81.52925, "tint": "#f2dfae", "ink": "#a8741f"},
  "tl-hideaway-bay": {"name": "Hideaway Bay", "short": "Hideaway Bay", "lat": 28.36646, "lng": -81.52848, "tint": "#a9e0ea", "ink": "#1f7f9a"},
  "tl-mount-mayday": {"name": "Mount Mayday", "short": "Mount Mayday", "lat": 28.3659, "lng": -81.5302, "tint": "#c9e3a8", "ink": "#4d7a2f"},
};

export const VENUES = {
  "tl-joffreys-coffee-tea-company": {"name": "Joffrey's Coffee & Tea Company", "land": "tl-getaway-glen", "lat": 28.3653, "lng": -81.5282},
  "tl-leaning-palms": {"name": "Leaning Palms", "land": "tl-getaway-glen", "lat": 28.36498, "lng": -81.528692},
  "tl-lets-go-slurpin": {"name": "Let's Go Slurpin'", "land": "tl-hideaway-bay", "lat": 28.36615, "lng": -81.528876},
  "tl-lowtide-lous": {"name": "Lowtide Lou's", "land": "tl-mount-mayday", "lat": 28.365527, "lng": -81.530145},
  "tl-snack-shack": {"name": "Snack Shack", "land": "tl-hideaway-bay", "lat": 28.3664, "lng": -81.5281},
  "tl-surf-doggies": {"name": "Surf Doggies", "land": "tl-hideaway-bay", "lat": 28.366096, "lng": -81.528814},
  "tl-typhoon-tillys": {"name": "Typhoon Tilly's", "land": "tl-hideaway-bay", "lat": 28.366755, "lng": -81.529509},
};

export const WALK = ["tl-getaway-glen", "tl-leaning-palms", "tl-joffreys-coffee-tea-company", "tl-hideaway-bay", "tl-snack-shack", "tl-surf-doggies", "tl-lets-go-slurpin", "tl-typhoon-tillys", "tl-mount-mayday", "tl-lowtide-lous"];

export const BOOTHS = [
  { name: "Joffrey's Coffee & Tea Company", anchor: "tl-joffreys-coffee-tea-company", where: "Getaway Glen", note: "", drinks: [
    ["Mocha Latte", "$6.79", "coffee", ""],
    ["Flavored Latte", "$6.79", "coffee", "Flavors available include Vanilla, Caramel, Hazelnut, and Irish Cream"],
    ["Shakin Jamaican Cold Brew", "$6.49", "coffee", ""],
    ["Frozen Cappuccino Dream", "$6.99", "coffee", ""],
    ["Joffrey's Espresso Martini", "$15.99", "cocktail", ""],
    ["Tea Breeze", "$15.99", "cocktail", ""],
    ["Strawberry Lemon Sunset", "$15.99", "cocktail", ""],
  ] },
  { name: "Leaning Palms", anchor: "tl-leaning-palms", where: "Getaway Glen", note: "", drinks: [
    ["Frozen Butterfly Pea Tea Lemonade", "$6.79", "na", "Frozen Minute Maid Lemonade and Butterfly Pea Tea"],
    ["DOLE Whip Orange Float", "$6.79", "na", "DOLE Whip Orange with Fanta Orange"],
    ["DOLE Whip Pineapple Float", "$6.79", "na", "DOLE Whip Pineapple with Pineapple Juice"],
    ["Piña Colada (Non-Alcoholic)", "$6.99", "na", ""],
    ["Joffrey's Cold Brew Coffee with Sweet Cream", "$5.99", "coffee", ""],
    ["Caribé Pineapple Hard Cider, Cape Canaveral, FL with a Souvenir Cup", "$15.25", "cider", "20-oz Draft - Refreshing, tropical hard cider with flavors of Pineapple. Additional refills are available at the Register"],
    ["Bud Light Lager - St. Louis, MO with a Souvenir Cup", "$13.25", "beer", "20-oz Draft - Golden-colored with flavors that are dry, clean, crisp, and refreshing with subtle bitterness. Additional refills are available at the Register"],
    ["Opici Family Red Sangria", "$13.00", "cocktail", ""],
    ["Opici Family White Sangria", "$13.00", "cocktail", ""],
    ["Pink Paloma", "$17.50", "cocktail", "Featuring Patrón Silver Tequila"],
    ["Frozen Butterfly Pea Tea Lemonade with Vodka", "$16.50", "frozen", "Frozen Minute Maid Lemonade and Butterfly Pea Tea with Tito's Handmade Vodka"],
    ["Frozen Blue Colada", "$15.50", "frozen", "Bacardí Superior Rum"],
    ["RAMONA Meyer Lemon Wine Spritz", "$11.50", "wine", ""],
    ["RAMONA Ruby Grapefruit Wine Spritz", "$11.50", "wine", ""],
    ["RAMONA Blood Orange Wine Spritz", "$11.50", "wine", ""],
  ] },
  { name: "Let's Go Slurpin'", anchor: "tl-lets-go-slurpin", where: "Hideaway Bay", note: "", drinks: [
    ["Sunset Margarita", "$18.50", "cocktail", "Teremana Blanco Tequila, Grand Marnier Liqueur, Hella Cocktail Co. Smoked Chili Bitters, Lime, and Agave"],
    ["Pineapple Mule", "$19.00", "cocktail", "Uncle Nearest 1884 Small Batch Whiskey, Hella Cocktail Co. Ginger Bitters, Pineapple Juice, Ginger Beer, and Mint"],
    ["Blueberry Lemonade", "$17.50", "cocktail", "Three Olives Blueberry Vodka, Bols Blue Curaçao Liqueur, and Lemonade with Juices of Lemon and Pomegranate topped with Sprite"],
    ["Slurpin' Mojito", "$16.50", "cocktail", "Ten to One Rum, Club Soda, Mint, and Lime"],
    ["Strawberry Daiquiri", "$15.50", "cocktail", "Don Q Cristal Rum and Lime Juice blended with Strawberry Purée"],
    ["Iced Tea and Lemonade with Vodka", "$18.50", "cocktail", "Tito’s Handmade Vodka"],
    ["Piña CoLAVA", "$18.50", "frozen", "Bacardi Raspberry Rum blended with Piña Colada Mix and Raspberry Purée"],
    ["RAMONA Blood Orange Wine Spritz", "$11.75", "wine", ""],
    ["RAMONA Meyer Lemon Wine Spritz", "$11.75", "wine", ""],
    ["RAMONA Ruby Grapefruit Wine Spritz", "$11.75", "wine", ""],
    ["Opici Family Sangria", "$14.00", "cocktail", "Red or White"],
  ] },
  { name: "Lowtide Lou's", anchor: "tl-lowtide-lous", where: "Mount Mayday", note: "", drinks: [
    ["Seasonal Draft Beer", "$12.75", "beer", "$13.50 to $15.50 High Noon Pineapple Vodka Hard Seltzer"],
    ["RAMONA Blood Orange Wine Spritz", "$11.75", "wine", ""],
    ["RAMONA Ruby Grapefruit Wine Spritz", "$11.75", "wine", ""],
    ["RAMONA Meyer Lemon Wine Spritz", "$11.75", "wine", ""],
  ] },
  { name: "Snack Shack", anchor: "tl-snack-shack", where: "Hideaway Bay", note: "", drinks: [
    ["DOLE Whip Strawberry Mai Tai Float", "$17.50", "cocktail", "DOLE Whip Strawberry with a blend of Captain Morgan Original Spiced Rum, Myers’s Original Dark Rum, Bols Blackberry Brandy, Minute Maid Orange Juice, and a splash of Fanta Strawberry"],
    ["Piña Colada", "$16.50", "cocktail", "Bacardí Superior Rum blended with Piña Colada Mix and Strawberry Purée"],
    ["Bud Light Lager", "$9.75", "beer", ""],
    ["Michelob Ultra Lager", "$10.25", "beer", ""],
  ] },
  { name: "Surf Doggies", anchor: "tl-surf-doggies", where: "Hideaway Bay", note: "", drinks: [
    ["High Noon Pineapple Hard Seltzer", "$12.75", "beer", ""],
    ["Bud Light Lager - St. Louis, MO", "$9.75", "beer", "16-oz Bottle - Golden-colored with flavors that are dry, clean, crisp, and refreshing with subtle bitterness"],
    ["Corona Extra Lager - Mexico", "$10.50", "beer", "16-oz Can - Golden-colored with flavors that are dry, clean, crisp, and refreshing with subtle bitterness"],
  ] },
  { name: "Typhoon Tilly's", anchor: "tl-typhoon-tillys", where: "Hideaway Bay", note: "", drinks: [
    ["Miss Tilly Sipper", "$22.49", "na", "Miss Tilly Sipper Cup is eligible for refills at Typhoon Lagoon Quick-Service Locations for the entire day."],
    ["Cinnamon Whisky Punch", "$15.50", "cocktail", "Fireball Cinnamon Whisky, Bols Crème de Banana Liqueur, DOLE Pineapple Juice, and Grenadine"],
    ["RAMONA Meyer Lemon Wine Spritz", "$11.75", "wine", ""],
    ["RAMONA Blood Orange Wine Spritz", "$11.75", "wine", ""],
    ["RAMONA Ruby Grapefruit Wine Spritz", "$11.75", "wine", ""],
    ["Surfside Iced Tea + Vodka Hard Tea", "$11.75", "cocktail", ""],
    ["Goose Island IPA - Chicago, IL with a Souvenir Cup", "$15.25", "beer", "20-oz Draft - This bigger brother to the Pale Ale employs a significant amount of hops with high bitterness and citrus and floral aromas. Additional refills are available at the Register"],
    ["Bud Light Lager - St. Louis, MO with a Souvenir Cup", "$13.25", "beer", "20-oz Draft - Golden-colored with flavors that are dry, clean, crisp, and refreshing with subtle bitterness. Additional refills are available at the Register"],
    ["Yuengling Traditional Lager – Pottsville, PA with a Souvenir Cup", "$13.25", "beer", "20-oz Draft - Fuller flavored with a higher malt presence than Pale Lagers. Additional refills are available at the Register"],
    ["Opici Family Red Sangria", "$14.00", "cocktail", ""],
    ["Opici Family White Sangria", "$14.00", "cocktail", ""],
  ] },
];
