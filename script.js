// --- 1. ການຕັ້ງຄ່າ Firebase (ຕົວຢ່າງ: ໃຫ້ປ່ຽນຄ່າ config ໃຫ້ກົງກັບโปรเจกต์ຂອງທ່ານ) ---
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "mysale-pork-pos.firebaseapp.com",
    projectId: "mysale-pork-pos",
    storageBucket: "mysale-pork-pos.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// เริ่มต้นใช้งาน Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// ຕົວແปร Global ສຳລັບຈັດການตะกร้าสินค้า
let cart = [];

// --- 2. ຟັງຊັນປ່ຽນໜ້າ Page ໃນ Web App ---
function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active-page'));
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active-page');
    }
}

// --- 3. ຟັງຊັນອັບເດດຈຳນວນສິນຄ້າທັງໝົດໃນສະຕ໋ອກ (ສະແດງໃນບ໊ອກสีแดง) ---
function updateProductCount() {
    db.collection("products").get().then((querySnapshot) => {
        const totalCount = querySnapshot.size; // ນັບຈຳນວນ Document ທັງໝົດ
        const countElement = document.getElementById("totalProductCount");
        if (countElement) {
            countElement.innerText = totalCount;
        }
    }).catch((error) => {
        console.error("Error getting product count: ", error);
    });
}

// --- 4. ໂຫຼດຂໍ້ມູນສິນຄ້າສະຕ໋ອກ ແລະ POS ---
function loadProducts() {
    db.collection("products").onSnapshot((snapshot) => {
        const inventoryList = document.getElementById("inventoryList");
        const productGrid = document.getElementById("productGrid");
        
        if (inventoryList) inventoryList.innerHTML = "";
        if (productGrid) productGrid.innerHTML = "";

        // อັບເດດຕົວເລກທັງໝົດທันทีที่มีการเปลี่ยนแปลงข้อมูล
        updateProductCount();

        snapshot.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id;

            // ວาดตารางในหน้าจัดการสต็อก
            if (inventoryList) {
                inventoryList.innerHTML += `
                    <tr>
                        <td>${product.barcode || ''}</td>
                        <td>${product.name || ''}</td>
                        <td>${Number(product.price || 0).toLocaleString()}</td>
                        <td>${product.stock || 0}</td>
                        <td><button class="btn-danger" onclick="deleteProduct('${productId}')">ລຶບ</button></td>
                    </tr>
                `;
            }

            // ວາດปุ่มสินค้าในหน้า POS
            if (productGrid) {
                productGrid.innerHTML += `
                    <div class="product-card" onclick="addToCart('${productId}', '${product.name}', ${product.price}, ${product.stock})">
                        <h4>${product.name}</h4>
                        <p>ລາຄາ: ${Number(product.price || 0).toLocaleString()} ກີບ</p>
                        <p>คงเหลือ: ${product.stock}</p>
                    </div>
                `;
            }
        });
    });
}

// --- 5. ເພີ່ມ ຫຼື ອັບເດດສິນຄ້າ ---
function addProduct(event) {
    event.preventDefault();
    
    const barcode = document.getElementById("pBarcode").value;
    const name = document.getElementById("pName").value;
    const price = Number(document.getElementById("pPrice").value);
    const stock = Number(document.getElementById("pStock").value);

    // ตรวจสอบว่ามีบาร์โค้ดนี้อยู่แล้วหรือไม่ เพื่อทำการอัปเดต หรือ สร้างใหม่
    db.collection("products").where("barcode", "==", barcode).get()
    .then((querySnapshot) => {
        if (!querySnapshot.empty) {
            // ถ้ามีอยู่แล้ว ให้อัปเดตข้อมูล
            const docId = querySnapshot.docs[0].id;
            return db.collection("products").doc(docId).update({
                name: name,
                price: price,
                stock: stock
            });
        } else {
            // ถ้ายังไม่มี ให้สร้างรายการใหม่
            return db.collection("products").add({
                barcode: barcode,
                name: name,
                price: price,
                stock: stock
            });
        }
    })
    .then(() => {
        alert("บันทึกข้อมูลสินค้าสำเร็จ!");
        document.getElementById("addProductForm").reset();
        document.getElementById("pBarcode").focus();
    })
    .catch((error) => {
        console.error("Error adding/updating product: ", error);
        alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    });
}

// --- 6. ลบสินค้า ---
function deleteProduct(productId) {
    if (confirm("ທ່ານຕ້ອງການລຶບສິນຄ້ານี้ແທ້ບໍ?")) {
        db.collection("products").doc(productId).delete().then(() => {
            alert("ລຶບສິນຄ້າສຳເລັດແລ້ວ");
        }).catch((error) => {
            console.error("Error removing product: ", error);
        });
    }
}

// --- 7. ตรวจสอบข้อมูลสินค้าเดิมเมื่อพิมพ์บาร์โค้ดในหน้าสต็อก ---
function checkExistingProduct(barcode) {
    db.collection("products").where("barcode", "==", barcode).get()
    .then((querySnapshot) => {
        if (!querySnapshot.empty) {
            const product = querySnapshot.docs[0].data();
            document.getElementById("pName").value = product.name || "";
            document.getElementById("pPrice").value = product.price || "";
            document.getElementById("pStock").value = product.stock || "";
        }
    });
}

// --- 8. ระบบจัดการตะกร้าสินค้า (POS) ---
function addToCart(id, name, price, stock) {
    if (stock <= 0) {
        alert("ສິນຄ້າหมดสต็อก!");
        return;
    }

    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        if (existingItem.quantity < stock) {
            existingItem.quantity++;
        } else {
            alert("สินค้าในสต็อกมีไม่เพียงพอ!");
        }
    } else {
        cart.push({ id, name, price, quantity: 1, stock });
    }
    renderCart();
}

function renderCart() {
    const cartItems = document.getElementById("cartItems");
    const cartTotal = document.getElementById("cartTotal");
    cartItems.innerHTML = "";

    let total = 0;
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        cartItems.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td>${Number(item.price).toLocaleString()}</td>
                <td>
                    <button onclick="changeQuantity(${index}, -1)">-</button>
                    ${item.quantity}
                    <button onclick="changeQuantity(${index}, 1)">+</button>
                </td>
                <td>${Number(itemTotal).toLocaleString()}</td>
                <td><button class="btn-danger" onclick="removeFromCart(${index})">ລຶບ</button></td>
            </tr>
        `;
    });

    cartTotal.innerText = total.toLocaleString();
    calculateChange();
}

function changeQuantity(index, delta) {
    const item = cart[index];
    const newQty = item.quantity + delta;
    if (newQty > 0 && newQty <= item.stock) {
        item.quantity = newQty;
    } else if (newQty > item.stock) {
        alert("สินค้าในสต็อกมีไม่เพียงพอ!");
    } else {
        cart.splice(index, 1);
    }
    renderCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

function calculateChange() {
    const totalText = document.getElementById("cartTotal").innerText.replace(/,/g, '');
    const total = parseFloat(totalText) || 0;
    const cash = parseFloat(document.getElementById("cashReceived").value) || 0;
    const change = cash - total;

    document.getElementById("changeTotal").innerText = change >= 0 ? change.toLocaleString() : "0";
}

// --- 9. ชำระเงิน (Checkout) และ ตัดสต็อก ---
function checkout() {
    if (cart.length === 0) {
        alert("ກະລຸນາເລືອກສິນຄ້າກ່ອນຈ່າຍເງິນ!");
        return;
    }

    const totalText = document.getElementById("cartTotal").innerText.replace(/,/g, '');
    const total = parseFloat(totalText) || 0;
    const cash = parseFloat(document.getElementById("cashReceived").value) || 0;

    if (cash < total) {
        alert("ເງິນສົດທີ່ຮັບມາໜ້ອຍກວ່າອດລວມ!");
        return;
    }

    const change = cash - total;
    const batch = db.batch();

    // ตัดสต็อกสินค้าใน Firebase
    cart.forEach(item => {
        const productRef = db.collection("products").doc(item.id);
        const newStock = item.stock - item.quantity;
        batch.update(productRef, { stock: newStock });
    });

    // บันทึกประวัติการขาย
    const saleData = {
        items: cart,
        total: total,
        cash: cash,
        change: change,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    const saleRef = db.collection("sales").doc();
    batch.set(saleRef, saleData);

    batch.commit().then(() => {
        alert("ບັນທຶກການຂາຍສຳເລັດ!");
        cart = [];
        renderCart();
        document.getElementById("cashReceived").value = "";
    }).catch((error) => {
        console.error("Error during checkout: ", error);
        alert("ເກີດข้อผิดพลาดในการบันทึกการขาย");
    });
}

// --- 10. ทำงานเมื่อหน้าเว็บโหลดเสร็จ ---
window.addEventListener("DOMContentLoaded", () => {
    loadProducts();
});