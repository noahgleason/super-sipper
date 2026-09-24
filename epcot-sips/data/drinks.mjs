// ─────────────────────────────────────────────────────────────────────────────
// EPCOT drink menu — 2026 EPCOT International Food & Wine Festival
// (Aug 27 – Nov 21, 2026). Compiled Sept 24, 2026 from Disney's released
// Global Marketplace menus (as published by Disney Tourist Blog) with prices
// from MiceChat's opening-day walkthrough. Prices marked null weren't published.
//
// This is only the STARTING menu. Once ANTHROPIC_API_KEY is set, the app
// researches the current festival menus itself and stores them in Netlify
// Blobs, replacing this. It's kept as the fallback if a refresh ever fails.
//
// Drink tuple: [name, price, type, description?]
// type: beer | cider | wine | sparkling | cocktail | frozen | flight | na | coffee
// ─────────────────────────────────────────────────────────────────────────────

export const FESTIVAL = {
  name: "EPCOT International Food & Wine Festival",
  year: 2026,
  starts: "2026-08-27",
  ends: "2026-11-21",
  updated: "2026-09-24",
  active: true,
};

export const NEXT_FESTIVAL = { name: "EPCOT International Festival of the Holidays", starts: "2026-11-27" };

export const BOOTHS = [
  // ── World Showcase ────────────────────────────────────────────────────────
  { id: "mexico", country: "mexico", anchor: "mexico", name: "Mexico", where: "Showcase Plaza toward Mexico", drinks: [
    ["Mexican Craft Beer", "$8.50 / $11.00", "beer"],
    ["Cherry Nostalgia", "$13.50", "cocktail", "Blanco tequila, botanical liqueur, cherry and lime with a hibiscus salt rim"],
    ["Fruta de la Pasión", "$13.75", "cocktail", "Blanco tequila, mezcal, tangy passion fruit purée and citrus juice with a salty chili rim"],
  ]},
  { id: "norway", country: "norway", anchor: "norway", name: "Kringla Bakeri og Kafe", where: "Norway pavilion", yearRound: true,
    note: "Norway's festival cart is food-only this year. This is the pavilion's year-round drink.", drinks: [
    ["Viking Coffee", null, "coffee", "Coffee with Kamora coffee liqueur and Baileys Irish Cream (year-round menu — not a festival item)"],
  ]},
  { id: "china", country: "china", anchor: "china", name: "China", where: "Between Norway and China", drinks: [
    ["Mango-Peach Bubble Tea", "$7.95", "na", "Green tea, mango and peach syrups, white boba"],
    ["Honghe Rice Lager Draft Beer", "$6.00 / $10.75", "beer"],
    ["Baijiu Punch", "$14.25", "cocktail", "Baijiu spirit, lychee syrup, soda water and piña colada mix"],
    ["Hainan Prosperity", "$14.25", "cocktail", "Tequila, vodka, orange juice and mango syrup"],
    ["Frozen Strawberry-Jasmine Cocktail", "$14.00", "frozen", "Light rum, jasmine tea and strawberry syrup"],
  ]},
  { id: "india", country: "india", anchor: "china-germany", name: "India", where: "Near China", opens: "2026-10-02", drinks: [
    ["Mango Lassi", "$5.29", "na"],
    ["Mango Lassi with Camikara Rum", "$12.50", "cocktail", "With Camikara 8-Year-Old Cask Aged Rum"],
    ["United Breweries Taj Mahal Premium Lager", "$6.00 / $9.75", "beer"],
    ["Sula Tropicale Brut Sparkling Wine", "$7.50", "sparkling"],
  ]},
  { id: "outpost", country: "africa", anchor: "china-germany", name: "Refreshment Outpost", where: "Between China and Germany", drinks: [
    ["Breckenridge Palisade Peach Wheat Ale", "$12.50", "beer"],
    ["3 Daughters Cinnamon Donut Hard Cider", "$12.50", "cider"],
    ["Coppertail Cherry Cola Hard Cider", "$12.50", "cider"],
    ["Midnight Safari", "$17.50", "cocktail", "Mansas African Whisky, crème de cassis and sour mix with blackberry and mint"],
  ]},
  { id: "alps", country: "alps", anchor: "germany", name: "The Alps", where: "Near Germany", opens: "2026-10-02", drinks: [
    ["Salomon Undhof Stein Kremstal Riesling", "$7.50", "wine"],
    ["Loimer Lois Grüner Veltliner", "$6.50", "wine"],
    ["Schlumberger Klassik Brut", "$7.75", "sparkling"],
    ["Alps Wine Flight", "$8.50", "flight"],
  ]},
  { id: "germany", country: "germany", anchor: "germany", name: "Germany", where: "Germany pavilion", drinks: [
    ["Schöfferhofer Orange Spritz Hefeweizen", "$6.00 / $9.75", "beer"],
    ["Weihenstephaner Festbier", "$6.00 / $9.75", "beer"],
    ["von Trapp Oktoberfest Märzen Lager", "$6.00 / $9.75", "beer"],
    ["Germany Beer Flight", "$12.75", "flight"],
    ["Selbach-Oster Riesling", "$9.00", "wine"],
  ]},
  { id: "sommerfest", country: "germany", anchor: "germany", name: "Sommerfest", where: "Germany pavilion", drinks: [
    ["Cinnamon Pretzel Cold Brew", null, "coffee", "Joffrey's cold brew with sweet cream, caramel, vanilla, cinnamon and pretzel pieces"],
  ]},
  { id: "spain", country: "spain", anchor: "germany-italy", name: "Spain", where: "Between Germany and Italy", drinks: [
    ["Summer in Spain", "$13.00", "frozen", "Frozen lemonade with herbal liqueurs"],
    ["Volver Quinta del '67 Garnacha Tintorera", "$7.50", "wine"],
  ]},
  { id: "italy", country: "italy", anchor: "italy", name: "Italy", where: "Italy pavilion", drinks: [
    ["Peroni Pilsner", "$6.50 / $12.00", "beer"],
    ["Prosecco", "$12.00", "sparkling"],
    ["Saracco Moscato d'Asti", "$13.00", "wine"],
    ["Cantine Guidi 'Luca' Red Blend", "$12.00", "wine"],
    ["Villa Matilde Falanghina", "$12.00", "wine"],
    ["Italian Red Sangria", "$14.00", "cocktail"],
    ["Amaretto Bellini", "$16.00", "cocktail", "Luxardo Amaretto, peach purée and Prosecco"],
    ["Italian Blood Orange Margarita", "$15.00", "cocktail", "Tequila, triple sec and blood orange liqueur"],
  ]},
  { id: "hops", country: "usa", anchor: "america", name: "Hops & Barley", where: "The American Adventure", drinks: [
    ["Harpoon Southie Lager", "$6.00 / $9.75", "beer"],
    ["Samuel Adams Boston Brick Red", "$6.00 / $9.75", "beer"],
    ["Allagash Haunted House Hoppy Dark Ale", "$6.00 / $9.75", "beer"],
    ["Hops & Barley Beer Flight", "$12.75", "flight"],
  ]},
  { id: "blockhans", country: "usa", anchor: "america", name: "Block & Hans", where: "The American Adventure", drinks: [
    ["Spicy Strawberry-Mango Smoothie", null, "na", "Strawberry smoothie with spicy mango syrup — ask for it spirited with Ole Smoky Strawberry Moonshine"],
  ]},
  { id: "regal", country: "usa", anchor: "america", name: "Regal Eagle Smokehouse", where: "The American Adventure", drinks: [
    ["Pumpkin Pie Milk Shake", null, "na", "Vanilla ice cream, pumpkin pie filling, caramel, whipped cream and streusel"],
  ]},
  { id: "japan", country: "japan", anchor: "japan", name: "Japan", where: "Between American Adventure and Japan", drinks: [
    ["Mango-Apple Fruit Pearl", null, "na", "Mango-apple drink with creamy Calpico and apple popping pearls"],
    ["Sapporo Reserve", "$5.00 / $9.50", "beer", "Also offered paired with wasabi-soy potato chips ($8.50 / $13.00)"],
    ["Autumn Breeze", "$8.25", "cocktail", "Plum wine cocktail with kiwi syrup, apple juice and a hint of yuzu"],
    ["Kirinzan Lemonade Sake", "$13.50", "cocktail", "Crisp sake-based lemonade"],
  ]},
  { id: "greece", country: "greece", anchor: "japan-morocco", name: "Greece", where: "Between Japan and Morocco", drinks: [
    ["Greek Melon Limeade", "$12.00", "cocktail", "Kleos Mastiha, Artonic Melon Apéritif, Pearl Vodka and lime sour"],
    ["Mylonas Assyrtiko Dry White", "$6.50", "wine"],
    ["Zoe Rosé", "$6.50", "wine"],
    ["Kir-Yianni Naoussa Xinomavro", "$7.50", "wine"],
    ["Greece Wine Flight", "$7.50", "flight"],
  ]},
  { id: "tangierine", country: "morocco", anchor: "morocco", name: "Tangierine Café: Flavors of the Medina", where: "Morocco pavilion", drinks: [
    ["Fig Cocktail", "$12.00", "cocktail", "Kleiner Feigling Fig Liqueur and white cranberry juice"],
    ["Carib Honey & Fig Dream Hard Cider", "$6.00 / $9.75", "cider"],
    ["Keel Farms Golden Apple Chai Hard Cider", "$6.00 / $9.75", "cider"],
    ["Keel Farms Goji Berry Citrus Hard Cider", "$6.00 / $9.75", "cider"],
    ["Hard Cider Flight", "$12.75", "flight"],
  ]},
  { id: "belgium", country: "belgium", anchor: "morocco-france", name: "Belgium", where: "Between Morocco and France", drinks: [
    ["Chilled Belgian Coffee", "$5.29", "na"],
    ["Chilled Belgian Coffee with Salted Caramel Liqueur", "$12.50", "coffee", "With ChocoLat Deluxe Salted Caramel Chocolate Liqueur"],
    ["Van Steenberge Piraat 7 Strong Ale", "$6.00 / $9.75", "beer"],
    ["St. Bernardus Watou Blond Ale", "$6.00 / $9.75", "beer"],
    ["Duchesse Red Sweet & Tart Cherry Ale", "$6.00 / $9.75", "beer"],
    ["Belgium Beer Flight", "$12.75", "flight"],
  ]},
  { id: "brazil", country: "brazil", anchor: "morocco-france", name: "Brazil", where: "Between Morocco and France", drinks: [
    ["Frozen Caipirinha", "$12.50", "frozen", "With cachaça"],
    ["BrewDog Peach Mango Wheat Ale", "$6.00 / $9.75", "beer"],
  ]},
  { id: "france", country: "france", anchor: "france", name: "France", where: "France pavilion", drinks: [
    ["Plaimont ELIA Colombard", "$6.95", "wine"],
    ["La Roche Prestige Cuvée", "$7.95", "wine"],
    ["Chilled French Cosmo", "$15.50", "cocktail", "Vodka, Grey Goose Le Citron, Grand Marnier and cranberry"],
  ]},
  { id: "ukcart", country: "uk", anchor: "uk", name: "UK Beer Cart", where: "United Kingdom pavilion", drinks: [
    ["Sparkling Cucumber-Gin Cocktail", null, "cocktail", "Fords Gin, blackberry brandy, cucumber syrup, lemonade and Prosecco"],
  ]},
  { id: "canada", country: "canada", anchor: "canada", name: "Canada", where: "Canada pavilion", drinks: [
    ["Collective Arts Festbier", "$6.00 / $9.75", "beer"],
    ["Château des Charmes Pétales Rouge", "$9.50", "wine"],
  ]},
  { id: "canadacart", country: "canada", anchor: "canada", name: "Canada Popcorn Cart", where: "Canada pavilion", drinks: [
    ["Northern Ruby", null, "cocktail", "Rhubarb liqueur, vodka, strawberry, ginger and lime"],
  ]},
  { id: "poutinerie", country: "canada", anchor: "plaza-canada-side", name: "La Poutinerie", where: "Showcase Plaza toward Canada", drinks: [
    ["Spiced Apple Slushy", null, "na", "Frozen ginger beer, lime and spiced apple — spirited version with Iceberg Canadian Vodka"],
  ]},
  { id: "australia", country: "australia", anchor: "disney-traders", name: "Australia", where: "Near Disney Traders", drinks: [
    ["Yalumba 'The Y Series' Viognier", "$6.50", "wine"],
    ["Bulletin Place Sauvignon Blanc", "$6.50", "wine"],
    ["Fowles Farm to Table Shiraz", "$7.50", "wine"],
    ["Australia Wine Flight", "$7.50", "flight"],
  ]},
  { id: "hawaii", country: "hawaii", anchor: "port-of-entry", name: "Hawaiʻi", where: "Near World Showcase entrance", drinks: [
    ["Oʻahu Sunrise", null, "cocktail", "Vodka, DOLE pineapple juice and grenadine"],
    ["Florida Avenue Lei'd Back Double IPA", "$6.00 / $9.75", "beer"],
    ["Florida Orange Groves Sparkling Pineapple Wine", "$10.00", "sparkling"],
  ]},

  // ── Around the park (non-country booths) ──────────────────────────────────
  { id: "shimmering", country: "park", anchor: "port-of-entry", name: "Shimmering Sips", where: "Near World Showcase entrance", drinks: [
    ["Tropical Mimosa", "$7.75", "sparkling", "Sparkling wine with passion fruit-orange-guava juice"],
    ["Berry Mimosa", "$7.75", "sparkling", "La Gioiosa Berry Fizz and white cranberry juice"],
    ["Blood Orange Mimosa", "$7.75", "sparkling"],
    ["Mimosa Flight", "$15.00", "flight"],
  ]},
  { id: "swirled", country: "park", anchor: "showcase-plaza", name: "Swirled Showcase", where: "World Showcase entrance", drinks: [
    ["Frozen Szarlotka (non-alcoholic)", "$6.79", "na", "Apple pie filling and apple-cinnamon cider topped with streusel"],
    ["Frozen Szarlotka with Vodka", "$13.00", "frozen", "With Żubrówka Bison Grass Vodka"],
    ["Irish Milk Shake", "$13.00", "frozen", "Guinness, Baileys and vanilla ice cream"],
    ["Strawberry Beer Float", "$13.25", "beer", "Früli Strawberry Belgian White with vanilla soft-serve"],
    ["Früli Strawberry Belgian White Beer", "$12.50", "beer"],
    ["Banfi Rosa Regale Sparkling Red", "$15.00", "sparkling"],
    ["Soft-Serve Floats", null, "na", "Coca-Cola, Barq's Red Crème Soda or Fanta Grape"],
  ]},
  { id: "bramblewood", country: "park", anchor: "culinary-corridor", name: "Bramblewood Bites", where: "Walkway to World Showcase", drinks: [
    ["Spiced Apple Rum Old Fashioned", "$12.50", "cocktail", "With Boyd & Blair Rum"],
    ["Crooked Can Banana Bread Wheat Beer", "$6.00 / $9.75", "beer"],
  ]},
  { id: "milled", country: "park", anchor: "culinary-corridor", name: "Milled & Mulled", where: "Walkway to World Showcase", drinks: [
    ["Southern Tier Sweater Weather Vanilla Toffee Amber", "$6.00 / $9.75", "beer"],
    ["3 Daughters Apple Strudel Hard Cider", "$6.00 / $9.75", "cider"],
  ]},
  { id: "forest", country: "park", anchor: "culinary-corridor", name: "Forest & Field", where: "Walkway to World Showcase", drinks: [
    ["Ommegang All Hallows Treat Chocolate PB Stout", "$6.00 / $9.75", "beer"],
    ["Famille Hugel Classic Pinot Noir", "$7.00", "wine"],
    ["Daou Vineyards Chardonnay", "$6.50", "wine"],
  ]},
  { id: "favorites", country: "park", anchor: "communicore", name: "Festival Favorites", where: "CommuniCore Plaza", opens: "2026-09-09", drinks: [
    ["Frozen Apple Blossom", "$16.50", "frozen", "Apple cider, ginger ale, Hartley Apple VSOP Brandy, mini marshmallows and maple"],
    ["Frozen S'mores", null, "na", "Chocolate shake with marshmallow syrup, mini marshmallows and graham cracker"],
    ["Schöfferhofer Grapefruit Hefeweizen", "$6.00 / $9.75", "beer"],
    ["Parish SIPS Cab Franc Strawberry Berliner Weisse", "$6.00 / $9.75", "beer"],
    ["3 Daughters Beach Blonde Ale", "$6.00 / $9.75", "beer"],
    ["Festival Favorites Beer Flight", "$12.75", "flight"],
  ]},
  { id: "wedge", country: "park", anchor: "communicore", name: "The Wedge", where: "CommuniCore Hall", opens: "2026-09-18", closes: "2026-11-08", drinks: [
    ["Cannoli Milk Shake", null, "na", "Chocolate shavings, cannoli shell and a cherry"],
    ["Bodegas Avancia Old Vines Godello", "$8.50", "wine"],
    ["Las Jaras Superbloom Rosé", "$8.50", "wine"],
    ["Caymus Cabernet Sauvignon", "$13.00", "wine"],
    ["The Wedge Wine Flight", "$12.50", "flight"],
    ["Wine & Cheese Pairing", "$17.50", "flight", "Wisconsin cheeses paired with three wines"],
  ]},
  { id: "brewwing", country: "park", anchor: "odyssey", name: "Brew-Wing Lab", where: "Odyssey Pavilion", drinks: [
    ["Frozen Pomegranate & Raspberry Tea", "$5.19", "na", "Twinings tea with orange ice cream molecules"],
    ["Pickle Milk Shake", null, "na"],
    ["Civil Society Everyday I'm Waffle'n IPA", "$6.00 / $9.75", "beer"],
    ["3 Daughters Peanut Butter Blondie Ale", "$6.00 / $9.75", "beer"],
    ["Playalinda Pumpkin Cheesecake Blonde Stout", "$6.00 / $9.75", "beer"],
    ["Bold Rock Apple Crumble Hard Cider", "$6.00 / $9.75", "cider"],
    ["Ciderboys Cherry Jubilee Hard Cider", "$6.00 / $9.75", "cider"],
    ["Ciderboys Pumpkin Spice Hard Cider", "$6.00 / $9.75", "cider"],
    ["Brew-Wing Beer or Cider Flight", "$12.75", "flight"],
  ]},
  { id: "connections", country: "park", anchor: "connections", name: "Connections Eatery", where: "World Celebration", drinks: [
    ["Frozen Waffle Old Fashioned", null, "frozen", "Maker's Mark, maple, butterscotch and bitters, topped with a liège waffle"],
  ]},
  { id: "sunshine", country: "park", anchor: "the-land", name: "Sunshine Seasons", where: "The Land", drinks: [
    ["Remy Milk Shake", null, "na", "Strawberry-cheesecake shake with a cookie, mini cheesecake and white chocolate Eiffel Tower"],
  ]},
  { id: "earth", country: "park", anchor: "the-land", name: "Earth Eats", where: "Near The Land", opens: "2026-10-02", drinks: [
    ["Strawberry Hibiscus Agua Fresca", "$4.79", "na"],
    ["Harken Barrel Fermented Chardonnay", "$6.50", "wine"],
  ]},
  { id: "gyozas", country: "park", anchor: "guardians", name: "Gyozas of the Galaxy", where: "Near Guardians of the Galaxy", drinks: [
    ["Willamette Valley Pinot Gris", "$7.50", "wine"],
  ]},
  { id: "fire", country: "park", anchor: "creations", name: "Flavors from Fire", where: "Near Creations Shop", drinks: [
    ["Swine Brine", "$13.00", "cocktail", "Jim Beam, apple-cinnamon cider, lemon and Dijon, topped with a pork wing"],
    ["Left Hand Sawtooth Amber Ale", "$6.00 / $9.75", "beer"],
    ["1000 Stories Bourbon Barrel Zinfandel", "$6.50", "wine"],
  ]},
  { id: "fry", country: "park", anchor: "test-track", name: "The Fry Basket", where: "Near Test Track", drinks: [
    ["Barrel of Monks Blood Orange Bliss Sour", "$6.00 / $9.75", "beer"],
    ["Boyd & Blair Grapefruit Mule", "$12.50", "cocktail"],
  ]},
  { id: "coastal", country: "park", anchor: "creations", name: "Coastal Eats", where: "Near Creations Shop", opens: "2026-10-02", drinks: [
    ["Rileys Lookout Sauvignon Blanc", "$6.50", "wine"],
    ["Boyd & Blair Pomegranate Codder", "$12.50", "cocktail"],
  ]},
  { id: "joffreys", country: "park", anchor: "showcase-plaza", name: "Joffrey's Coffee (4 carts)", where: "Throughout the park", drinks: [
    ["Affogato alle Mandorle Cold Brew", null, "coffee", "Almond syrup, oat milk, whipped cream, toffee nut — spirited w/ Grey Goose (American Adventure cart)"],
    ["Dolce Affogato Cold Brew", null, "coffee", "Sugar cane syrup, oat milk, rainbow sprinkles — spirited w/ Baileys (near Disney Traders)"],
    ["Notte di Caramello Cold Brew", null, "coffee", "Caramel, oat milk, cinnamon — spirited w/ Baileys (between UK and Canada)"],
    ["Affogato di Marshmallow Cold Brew", null, "coffee", "Toasted marshmallow, oat milk, graham — spirited w/ Grey Goose (near Cosmic Rewind)"],
  ]},
];

