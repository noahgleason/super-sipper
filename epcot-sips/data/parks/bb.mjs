// Disney's Blizzard Beach: lands, drink spots and the starter menu (Walt Disney World).
// Generated from TouringPlans' park menus (verified Sept 2026) and OpenStreetMap positions.
// The app replaces this with a fresher menu whenever someone runs this park's prompt or research.
// Drink tuple: [name, price, type, description]

export const CHECKED = "2026-09-25";
export const SOURCES = ["https://touringplans.com/blizzard-beach/dining"];

export const LANDS = {
  "bb-ski-village": {"name": "Ski Resort Village", "short": "Ski Village", "lat": 28.35162, "lng": -81.57335, "tint": "#e8c9a8", "ink": "#8a5a36"},
  "bb-mount-gushmore": {"name": "Mount Gushmore", "short": "Mount Gushmore", "lat": 28.35176, "lng": -81.5756, "tint": "#cfe6f5", "ink": "#3b6fa8"},
  "bb-tikes-peak": {"name": "Tike's Peak", "short": "Tike's Peak", "lat": 28.35291, "lng": -81.57451, "tint": "#f3cde0", "ink": "#b8406e"},
};

export const VENUES = {
  "bb-avalunch": {"name": "Avalunch", "land": "bb-tikes-peak", "lat": 28.35219, "lng": -81.574633},
  "bb-frostbite-freddys": {"name": "Frostbite Freddy's", "land": "bb-ski-village", "lat": 28.352336, "lng": -81.573667},
  "bb-joffreys-coffee-tea": {"name": "Joffrey's Coffee & Tea Company", "land": "bb-ski-village", "lat": 28.35125, "lng": -81.573},
  "bb-lottawatta-lodge": {"name": "Lottawatta Lodge", "land": "bb-ski-village", "lat": 28.351549, "lng": -81.573258},
  "bb-polar-pub": {"name": "Polar Pub", "land": "bb-ski-village", "lat": 28.351119, "lng": -81.574115},
  "bb-warming-hut": {"name": "Warming Hut", "land": "bb-mount-gushmore", "lat": 28.35205, "lng": -81.57515},
};

export const WALK = ["bb-ski-village", "bb-lottawatta-lodge", "bb-joffreys-coffee-tea", "bb-polar-pub", "bb-frostbite-freddys", "bb-mount-gushmore", "bb-warming-hut", "bb-tikes-peak", "bb-avalunch"];

export const BOOTHS = [
  { name: "Avalunch", anchor: "bb-avalunch", where: "Tike's Peak", note: "", drinks: [
    ["Dogfish Head 60 Minute IPA - Milton, DE with a Souvenir Cup", "$15.25", "beer", "20-oz Draft – Floral pine forest aromas, ripe dark fruit flavors, and a nutty, caramel-malt accented body. Additional refills available at the Register."],
    ["Bud Light Lager - St. Louis, MO with a Souvenir Cup", "$12.75", "beer", "20-oz Draft - Golden-colored with flavors that are dry, clean, crisp, and refreshing with subtle bitterness. Additional refills are available at the Register"],
    ["Yuengling Traditional Lager – Pottsville, PA with a Souvenir Cup", "$12.75", "beer", "20-oz Draft - Fuller flavored with a higher malt presence than Pale Lagers. Additional refills are available at the Register"],
    ["Lexington Kentucky Bourbon Barrel Ale - Lexington, KY with a Souvenir Cup", "$9.00", "beer", "20-oz Draft - Rich and bold aged in decanted Kentucky bourbon barrels which add notes of caramel, oak, and a sweet bourbon finish.  Additional refills available at the Register."],
    ["High Noon Pineapple Vodka Seltzer", "$12.75", "beer", ""],
    ["Crooked Can High Stepper IPA", "$12.25", "beer", "Citrus ale, full-flavored, clean finish"],
    ["RAMONA Ruby Grapefruit Wine Spritz", "$11.75", "wine", "Lightly sparkling Sicilian wine made with Zibibbo grapes mixed with ruby grapefruit juice"],
  ] },
  { name: "Frostbite Freddy's", anchor: "bb-frostbite-freddys", where: "Ski Resort Village", note: "", drinks: [
    ["Premium and Craft Beer with a Souvenir Cup", "$15.50", "beer", ""],
    ["Domestic Beer with a Souvenir Cup", "$13.50", "beer", ""],
    ["Grand Margarita", "$18.50", "cocktail", "Jose Cuervo Gold Tequila, Grand Marnier Liqueur, Lime Juice, and Sweet-and-Sour"],
    ["Rum Runner", "$16.50", "cocktail", "Don Q Cristal Rum, Bols Blackberry, Brandy, Bols Crème de Banana Liqueur, and a Tropical Juices topped with a float of Meyers's Original Dark Rum"],
    ["Grapefruit Margarita", "$18.50", "cocktail", "Patron Silver Tequila, Cointreau Liqueur, and Ruby Red Grapefruit Juice"],
    ["Strawberry Daiquiri", "$15.50", "cocktail", "Don Q Cristal Rum and Lime Juice blended with Strawberry Purée"],
    ["Piña CoLAVA", "$18.50", "frozen", "Bacardi Raspberry Rum blended with Piña Colada Mix and Raspberry Purée"],
    ["Black Cherry Lemonade", "$18.50", "cocktail", "Three Olives Cherry Vodka, Lemonade, Lime Juice, and Grenadine topped with Sprite"],
    ["Cold Fashioned", "$18.50", "frozen", "Woodford Reserve Kentucky Straight Bourbon, Citrus and Tea Slushy, and Angostura Bitters"],
  ] },
  { name: "Joffrey's Coffee & Tea Company", anchor: "bb-joffreys-coffee-tea", where: "Ski Resort Village", note: "", drinks: [
    ["Vanilla Latte", "$6.39", "coffee", ""],
    ["Signature Frozen Lemon", "$6.09", "na", ""],
    ["Frozen Cappuccino Dream", "$6.99", "coffee", ""],
    ["Shakin Jamaican Cold Brew", "$5.99", "coffee", ""],
    ["Joffrey's Espresso Martini", "$14.99", "cocktail", ""],
    ["Strawberry Lemon Sunset", "$14.99", "cocktail", ""],
    ["Tea Breeze", "$14.99", "cocktail", ""],
  ] },
  { name: "Lottawatta Lodge", anchor: "bb-lottawatta-lodge", where: "Ski Resort Village", note: "", drinks: [
    ["Joffrey's Cold Brew Coffee with Sweet Cream", "$5.99", "coffee", ""],
    ["Bud Light Lager - St. Louis, MO with a Souvenir Cup", "$13.50", "beer", "20-oz Draft - Golden-colored with flavors that are dry, clean, crisp, and refreshing with subtle bitterness. Additional refills are available at the Register"],
    ["Yuengling Traditional Lager – Pottsville, PA with a Souvenir Cup", "$13.50", "beer", "20-oz Draft - Fuller flavored with a higher malt presence than Pale Lagers. Additional refills are available at the Register"],
    ["Crooked Can High Stepper IPA", "$12.25", "beer", "Citrus ale, full-flavored, clean finish"],
    ["Athletic Brewing Co Upside Dawn Golden", "$8.25", "beer", "Earthy and spicy notes balanced with citrusy aromas"],
    ["Winter Paloma", "$17.50", "cocktail", "Patrón Silver Tequila, Cranberry Juice, Pomegranate Juice, and a splash of Seagram's"],
    ["Piña CoLAVA", "$18.50", "frozen", "Bacardi Superior Rum blended with Piña Colada Mix, and Raspberry Purée"],
    ["High Noon Pineapple Vodka Hard Seltzer", "$12.75", "beer", "Vodka and Soda with flavors of Pineapple"],
    ["RAMONA Meyer Lemon Wine Spritz", "$11.75", "wine", "Lightly sparkling Sicilian Wine mixed with Organic Lemon Juice"],
    ["RAMONA Blood Orange Wine Spritz", "$11.75", "wine", "Lightly sparkling Sicilian Wine mixed with Organic Blood Orange Juice"],
    ["RAMONA Ruby Grapefruit Wine Spritz", "$11.75", "wine", "Lightly sparkling Sicilian wine made with Zibibbo grapes mixed with ruby grapefruit juice"],
  ] },
  { name: "Polar Pub", anchor: "bb-polar-pub", where: "Ski Resort Village", note: "", drinks: [
    ["Grand Margarita", "$18.50", "cocktail", "Jose Cuervo Gold Tequila, Grand Marnier, Lime Juice and Sweet-and-Sour"],
    ["Grapefruit Margarita", "$18.50", "cocktail", "Patrón Silver Tequila, Cointreau and Ruby Red Grapefruit Juice"],
    ["Strawberry Daiquiri", "$15.50", "cocktail", "Don Q Cristal Rum and Lime Juice blended with Strawberry Purée"],
    ["Piña CoLAVA", "$18.50", "frozen", "Bacardi Raspberry Rum blended with Piña Colada Mix and Raspberry Purée"],
    ["Black Cherry Lemonade", "$18.50", "cocktail", "Three Olives Cherry Vodka, Minute Maid Premium Lemonade, Lime Juice and Grenadine topped with Sprite"],
    ["Cold Fashioned", "$18.50", "frozen", "Woodford Reserve Kentucky Straight Bourbon, Citrus and Tea Slushy, and Angostura Bitters"],
    ["Premium and Craft Beer", "$15.50", "beer", "with a Souvenir Cup. Same-day Refills 9.25"],
    ["Domestic Beer", "$13.50", "beer", "with a Souvenir Cup. Same-day Refills 8.25"],
  ] },
  { name: "Warming Hut", anchor: "bb-warming-hut", where: "Mount Gushmore", note: "", drinks: [
    ["Crooked Can High Stepper IPA", "$12.25", "beer", "Citrus ale, full-flavored, clean finish"],
    ["Blue Moon Belgian White Ale - Golden, CO", "$10.25", "beer", "16-oz Can - Easy and refreshing with light notes of citrus and spice with low bitterness"],
  ] },
];
