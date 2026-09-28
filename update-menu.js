const fs = require('fs');

const csvData = `item_id,category,subcategory,item_name,description,price,dietary_type,spice_level,calorie_range,allergens,image_filename,is_featured,is_available,sort_order,tags
Auto-generated if left blank,Required  pick from dropdown,Optional  free text,Required,Optional  auto-generated if blank,Required  number only,Required  pick from dropdown,Optional  defaults to None,Optional  e.g. 350-500,Optional  comma-separated,Required  must match uploaded photo,Optional  defaults to No,Optional  defaults to Yes,Optional  auto-assigned if blank,Optional  comma-separated
,Veg Appetizers,,Samosa (2),"Fried crispy shell stuffed with spiced potatoes, peas, coriander and served with chutney.",$2.50,Vegan,Mild,150-250,Gluten,samosa.jpg,No,Yes,1,"fried,starter"
,Veg Appetizers,,Gobi Manchurian,"Fried cauliflower fritters tossed with green onion, garlic and soy sauce based gravy.",$10.99,Veg,Medium,300-450,"Soy,Gluten",gobi_manchurian.jpg,No,Yes,2,"indo-chinese,fried"
,Veg Appetizers,,Chilli Paneer,"Indian cottage cheese tossed with tangy sauce, onions and peppers.",$13.99,Veg,Hot,350-500,"Dairy,Gluten",chilli_paneer.jpg,No,Yes,3,"indo-chinese,spicy"
,Non Veg Appetizers,,Madras Chicken 65,"Marinated chicken, deep fried with madras spices.",$12.99,Non-Veg,Hot,350-500,,madras_chicken_65.jpg,Yes,Yes,4,"fried,spicy,popular"
,Non Veg Appetizers,,Chicken Lollipop - Wet,"Chicken lollipop, deep-fried and tossed in a tangy and spicy sauce, typically includes a mix of herbs and Indian spices.",$13.99,Non-Veg,Hot,400-550,,chicken_lollipop_wet.jpg,Yes,Yes,5,"fried,shareable,popular"
,Non Veg Appetizers,,Tandoori Shrimp,"Shrimp marinated in a blend of yogurt and spices, skewered, and traditionally roasted in a tandoor oven.",$13.99,Non-Veg,Medium,250-400,"Shellfish,Dairy",tandoori_shrimp.jpg,No,Yes,6,"tandoor,grilled"
,Veg Curries,,Paneer Butter Masala,"Cubes of home-made indian cheese, grilled and cooked with a creamy curry sauce.",$13.99,Veg,Mild,450-600,Dairy,paneer_butter_masala.jpg,No,Yes,7,"creamy,classic"
,Veg Curries,,Dal Makhani,"Rich and creamy lentil butter curry, a vegetarian delight bursting with aromatic Indian spices.",$11.99,Veg,Mild,350-500,Dairy,dal_makhani.jpg,No,Yes,8,"creamy,comfort food"
,Veg Curries,,Malai Kofta,Vegetable dumplings cooked with herbs and spices in a creamy sauce.,$13.99,Veg,Mild,400-550,"Dairy,Nuts",malai_kofta.jpg,No,Yes,9,"creamy,dumplings"
,Non Veg Curries,,Butter Chicken,"Specially marinated chicken, cooked in rich tomato butter creamy sauce.",$13.99,Non-Veg,Mild,450-600,Dairy,butter_chicken.jpg,No,Yes,10,"creamy,classic"
,Non Veg Curries,,Egg Masala,Boiled egg cooked with onion tomato masala and indian spices.,$11.99,Egg,Medium,300-450,Egg,egg_masala.jpg,No,Yes,11,comfort food
,Non Veg Curries,,Chettinad Goat Curry,"Goat cooked in special curry sauce, tossed with garlic, chilli, coriander and spices.",$13.99,Non-Veg,Hot,400-550,,chettinad_goat_curry.jpg,No,Yes,12,"regional,spicy"
,Rice,,Veg Fried Rice,"Rice with veggies fried with exotic sauces, a classic street side preparation.",$11.99,Veg,Mild,400-550,Soy,veg_fried_rice.jpg,No,Yes,13,indo-chinese
,Rice,,Chicken Fried Rice,Rice with shredded chicken a classic street side preparation.,$13.99,Non-Veg,Mild,450-600,Soy,chicken_fried_rice.jpg,No,Yes,14,indo-chinese
,Rice,,Chicken 65 Fried Rice,Rice with chicken 65 a classic street side preparation.,$13.99,Non-Veg,Hot,500-650,Soy,chicken_65_fried_rice.jpg,No,Yes,15,"indo-chinese,spicy"
,Hyderabadi Dum Biryani,,Chicken Biryani,"Chicken cooked with spices and tomatoes, layered in basmati rice and exotic spices and served with boiled egg.",$13.99,Non-Veg,Medium,550-700,Egg,chicken_biryani.jpg,Yes,Yes,16,"signature,dum-cooked"
,Hyderabadi Dum Biryani,,Gongura Chicken Biryani,"Boneless chicken cooked with sour green leaves, spices and tomatoes, layered in basmati rice and exotic spices and served with boiled egg.",$13.99,Non-Veg,Medium,550-700,Egg,gongura_chicken_biryani.jpg,No,Yes,17,"regional,tangy"
,Hyderabadi Dum Biryani,,Goat Biryani,"Mutton cooked with spices and tomatoes, layered in basmati rice and exotic spices and served with boiled egg.",$13.99,Non-Veg,Medium,600-750,Egg,goat_biryani.jpg,Yes,Yes,18,"signature,dum-cooked"
,Hyderabadi Dum Biryani,,Paneer Biryani,Layered basmati rice with succulent paneer cubes and aromatic spices.,$13.99,Veg,Medium,500-650,Dairy,paneer_biryani.jpg,No,Yes,19,dum-cooked
,Breads,,Naan,Indian flat bread made with all purpose flour cooked in clay oven.,$1.99,Veg,None,150-250,Gluten,naan.jpg,No,Yes,20,tandoor
,Breads,,Garlic Naan,"Indian flat bread made with all purpose flour cooked in clay oven, flavored with garlic and herb.",$2.49,Veg,None,150-250,Gluten,garlic_naan.jpg,No,Yes,21,"tandoor,popular"
,Breads,,Roti,Wheat dough cooked in clay oven.,$2.49,Vegan,None,100-200,Gluten,roti.jpg,No,Yes,22,tandoor
,Desserts,,Gulab Jamun (3),Deep fried Khova balls soaked in sticky sugar syrup.,$2.99,Veg,None,250-350,"Dairy,Gluten",gulab_jamun.jpg,No,Yes,23,"sweet,classic"
,Desserts,,Rasmalai (3),Soft cooked cheese patties soaked in sweetened and flavored milk sauce.,$2.99,Veg,None,200-300,"Dairy,Nuts",rasmalai.jpg,No,Yes,24,"sweet,chilled"
,Drinks,,Mango Lassi,Traditional Indian drink with mango and yogurt.,$2.49,Veg,None,150-250,Dairy,mango_lassi.jpg,No,Yes,25,"cold,refreshing"
,Soups,,Spicehub Veg Soup,Soup made with fresh crushed tomato paste and sour ingredients.,$5.99,Vegan,Mild,100-200,,spicehub_veg_soup.jpg,No,Yes,26,"starter,tangy"
,Soups,,Sweet Corn Soup,Soup made with sweet corn and starch.,$6.99,Veg,None,150-250,,sweet_corn_soup.jpg,No,Yes,27,"starter,mild"`;

function parseCSVLine(line) {
    let result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        let char = line[i];
        if (inQuotes) {
            if (char === '"') {
                inQuotes = false;
            } else {
                current += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
    }
    result.push(current);
    return result;
}

const lines = csvData.trim().split('\n');
const items = [];

// Skip header and subtitle (indices 0 and 1)
for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = parseCSVLine(line);
    
    // id: generate from name
    let id = parts[3].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let name = parts[3];
    let category = parts[1];
    let priceStr = parts[5] ? parts[5].replace('$', '').trim() : '0';
    let price = parseFloat(priceStr);
    
    let spice_level = parts[7] ? parts[7].toLowerCase() : null;
    if (spice_level === 'none') spice_level = null;
    
    let dietary_type = parts[6] ? parts[6].trim() : null;
    
    items.push({
        id,
        name,
        category,
        price,
        spice_level,
        dietary_type
    });
}

const menu = {
    tenant_id: "spicehub-kitchen",
    currency: "USD",
    items: items
};

fs.writeFileSync('./data/menu.json', JSON.stringify(menu, null, 2));
console.log('Successfully updated menu.json with ' + items.length + ' items.');
