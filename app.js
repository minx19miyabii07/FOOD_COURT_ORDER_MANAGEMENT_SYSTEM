const SUPABASE_URL = 'https://qwbbpkbgxsprfzmwnfbz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_oLIwUQcx2nmID-AIjw_HhQ_hAJjHvVl';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

class Queue {
  constructor() {
    this.head = null;
    this.tail = null;
    this.size = 0;
  }

  enqueue(value) {
    const node = { v: value, next: null };
    if (this.tail) {
      this.tail.next = node;
    } else {
      this.head = node;
    }
    this.tail = node;
    this.size++;
  }

  dequeue() {
    if (!this.head) return null;
    const value = this.head.v;
    this.head = this.head.next;
    if (!this.head) this.tail = null;
    this.size--;
    return value;
  }

  peek() {
    return this.head ? this.head.v : null;
  }

  toArray() {
    const result = [];
    for (let node = this.head; node; node = node.next) {
      result.push(node.v);
    }
    return result;
  }
}

class Stack {
  constructor() {
    this.items = [];
  }

  push(value) {
    this.items.push(value);
  }

  pop() {
    return this.items.pop() ?? null;
  }

  peek() {
    return this.items[this.items.length - 1] ?? null;
  }

  get size() {
    return this.items.length;
  }

  toArray() {
    return [...this.items].reverse();
  }
}

class BST {
  constructor() {
    this.root = null;
  }

  insert(key, item) {
    key = key.toLowerCase();
    const node = { key, items: [item], left: null, right: null };

    if (!this.root) {
      this.root = node;
      return;
    }

    let current = this.root;
    while (true) {
      if (key === current.key) {
        current.items.push(item);
        return;
      }
      const side = key < current.key ? 'left' : 'right';
      if (!current[side]) {
        current[side] = node;
        return;
      }
      current = current[side];
    }
  }

  search(text) {
    text = text.toLowerCase();
    const results = [];

    const walk = node => {
      if (!node) return;
      walk(node.left);
      if (node.key.includes(text)) results.push(...node.items);
      walk(node.right);
    };

    walk(this.root);
    return results;
  }
}

let cart = new Map();
let menuMap = new Map();
let menuTree = new BST();
const cartUndo = new Stack();

function mergeSort(arr, compare) {
  if (arr.length <= 1) return arr;

  const mid = arr.length >> 1;
  const left = mergeSort(arr.slice(0, mid), compare);
  const right = mergeSort(arr.slice(mid), compare);
  const result = [];
  let i = 0;
  let j = 0;

  while (i < left.length && j < right.length) {
    if (compare(left[i], right[j]) <= 0) {
      result.push(left[i++]);
    } else {
      result.push(right[j++]);
    }
  }

  return result.concat(left.slice(i), right.slice(j));
}

function binarySearch(sorted, id) {
  let low = 0;
  let high = sorted.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (sorted[mid].id === id) return sorted[mid];
    if (sorted[mid].id < id) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return null;
}

async function sha256(text) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buffer)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const valid = {
  username: s => /^[A-Za-z0-9_]{3,20}$/.test(s),
  name: s => /^[A-Za-z .'-]{2,40}$/.test(s),
  password: s => s.length >= 6,
  price: n => Number.isFinite(n) && n > 0 && n <= 10000,
  stock: n => Number.isInteger(n) && n >= 0 && n <= 9999,
};

const cartTotal = () =>
  [...cart].reduce((total, [id, qty]) => total + menuMap.get(id).price * qty, 0);

const cartStall = () => {
  if (!cart.size) return null;
  const firstId = cart.keys().next().value;
  return menuMap.get(firstId).stall;
};

const $ = id => document.getElementById(id);

const esc = s =>
  String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));

const peso = n => '₱' + Number(n).toFixed(2);

const manilaDate = ms =>
  new Date(ms).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

const todayStr = () => manilaDate(Date.now());
const yesterdayStr = () => manilaDate(Date.now() - 86400000);

const stamp = t =>
  new Date(t).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

let user = JSON.parse(sessionStorage.getItem('fc_user') || 'null');
let page = '';
let timer = null;
let liveTimer = null;
let channel = null;
let selectedRole = 'customer';
let staffStall = '';
let placing = false;

const inScope = item => !user.stall || item.stall === user.stall;

function toast(message, duration = 2200) {
  const t = $('toast');
  t.textContent = message;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), duration);
}

function show(view) {
  ['login-view', 'app-view', 'thanks-view'].forEach(v => {
    $(v).classList.toggle('hidden', v !== view);
  });
}

async function run(query) {
  const { data, error } = await query;
  if (error) {
    toast(error.message);
    throw error;
  }
  return data;
}

$('role-tabs').onclick = e => {
  const role = e.target.dataset.role;
  if (!role) return;

  selectedRole = role;
  $('login-msg').textContent = '';
  [...$('role-tabs').children].forEach(b => {
    b.classList.toggle('active', b === e.target);
  });
  $('register-link').classList.toggle('hidden', role !== 'customer');
  $('register-form').classList.add('hidden');
  $('login-form').classList.remove('hidden');
};

$('show-register').onclick = e => {
  e.preventDefault();
  $('login-form').classList.add('hidden');
  $('register-link').classList.add('hidden');
  $('register-form').classList.remove('hidden');
};

$('back-login').onclick = () => {
  $('register-form').classList.add('hidden');
  $('login-form').classList.remove('hidden');
  $('register-link').classList.remove('hidden');
};

$('login-form').onsubmit = async e => {
  e.preventDefault();
  const username = $('l-user').value.trim();
  const password = $('l-pass').value;

  if (!valid.username(username) || !password) {
    $('login-msg').textContent = 'Enter a valid username and password.';
    return;
  }

  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('role', selectedRole)
    .eq('password_hash', await sha256(password))
    .maybeSingle();

  if (error) {
    $('login-msg').textContent = error.message;
    return;
  }
  if (!data) {
    $('login-msg').textContent = `Wrong username or password for a ${selectedRole} account.`;
    return;
  }

  user = { id: data.id, name: data.full_name, role: data.role, stall: data.stall || null };
  sessionStorage.setItem('fc_user', JSON.stringify(user));
  $('login-form').reset();
  enterApp();
};

$('register-form').onsubmit = async e => {
  e.preventDefault();
  const name = $('r-name').value.trim();
  const username = $('r-user').value.trim();
  const password = $('r-pass').value;
  const msg = $('reg-msg');

  if (!valid.name(name)) {
    msg.textContent = 'Name: letters only, 2-40 characters.';
    return;
  }
  if (!valid.username(username)) {
    msg.textContent = 'Username: 3-20 letters, numbers, or underscores.';
    return;
  }
  if (!valid.password(password)) {
    msg.textContent = 'Password must be at least 6 characters.';
    return;
  }

  const { error } = await db.from('users').insert({
    username,
    full_name: name,
    password_hash: await sha256(password),
    role: 'customer',
  });

  if (error) {
    msg.textContent = error.code === '23505' ? 'That username is taken.' : error.message;
    return;
  }

  $('register-form').reset();
  msg.textContent = '';
  $('back-login').click();
  toast('Account created. You can log in now.');
};

function logout() {
  sessionStorage.removeItem('fc_user');
  user = null;
  cart.clear();
  cartUndo.items = [];
  clearInterval(timer);
  clearTimeout(liveTimer);
  if (channel) {
    db.removeChannel(channel);
    channel = null;
  }
  show('login-view');
}

$('logout').onclick = logout;
$('thanks-logout').onclick = logout;
$('thanks-back').onclick = () => {
  show('app-view');
  go('menu');
};

const NAVS = {
  customer: [['menu', 'Menu & cart'], ['history', 'My orders']],
  staff: [['queue', 'Order queue'], ['stock', 'Stock']],
  admin: [['menus', 'Menu'], ['orders', 'Order history'], ['users', 'Users']],
};

const REACTS = {
  menu_items: ['menu', 'stock', 'menus'],
  orders: ['history', 'queue', 'orders'],
};

function startLive() {
  if (channel) db.removeChannel(channel);
  channel = db
    .channel('live-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => onLive('menu_items'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => onLive('orders'))
    .subscribe();
}

function onLive(table) {
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => {
    if (!user || !REACTS[table].includes(page)) return;
    if (page === 'menu') {
      refreshMenuData();
      return;
    }
    const active = document.activeElement;
    const typing = active && active.matches('#main input, #main select');
    if (typing) return;
    views[page]();
  }, 300);
}

function enterApp() {
  show('app-view');
  const where = user.stall ? ` · ${user.stall}` : '';
  $('who').textContent = `${user.name} (${user.role}${where})`;
  $('nav').innerHTML = NAVS[user.role]
    .map(([key, label]) => `<button data-p="${key}">${label}</button>`)
    .join('');
  $('nav').onclick = e => e.target.dataset.p && go(e.target.dataset.p);
  startLive();
  go(NAVS[user.role][0][0]);
}

async function go(p) {
  page = p;
  clearInterval(timer);
  [...$('nav').children].forEach(b => {
    b.classList.toggle('active', b.dataset.p === p);
  });
  await views[p]();

  const polled = {
    menu: () => refreshMenuData(),
    history: () => views.history(),
    queue: () => views.queue(),
    orders: () => views.orders(),
  };
  if (polled[p]) {
    timer = setInterval(polled[p], 10000);
  }
}

async function loadMenu() {
  const rows = await run(db.from('menu_items').select('*').order('id'));
  menuMap = new Map(rows.map(r => [r.id, r]));
  menuTree = new BST();
  rows.forEach(r => menuTree.insert(r.name, r));
  return rows;
}

function searchMenu(text) {
  const needle = text.toLowerCase();
  const found = new Map();
  menuTree.search(text).forEach(i => found.set(i.id, i));
  menuMap.forEach(i => {
    if (i.stall.toLowerCase().includes(needle)) found.set(i.id, i);
  });
  return [...found.values()];
}

function syncCart() {
  let changed = false;
  for (const [id, qty] of [...cart]) {
    const item = menuMap.get(id);
    if (!item || !item.available || item.stock === 0) {
      cart.delete(id);
      changed = true;
    } else if (qty > item.stock) {
      cart.set(id, item.stock);
      changed = true;
    }
  }
  return changed;
}

const sortOpts = `
  <option value="name">Name A-Z</option>
  <option value="price-asc">Price low-high</option>
  <option value="price-desc">Price high-low</option>`;

const CMP = {
  name: (a, b) => a.name.localeCompare(b.name),
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
};

const views = {};

views.menu = async () => {
  const rows = await loadMenu();
  const categories = [...new Set(rows.map(r => r.category))].sort();
  const stalls = [...new Set(rows.map(r => r.stall))].sort();

  $('main').innerHTML = `
    <div class="grid">
      <div class="panel">
        <h2>Menu</h2>
        <div class="toolbar">
          <input id="q" placeholder="Search dishes…" aria-label="Search">
          <select id="stall" aria-label="Stall">
            <option value="">All stalls</option>
            ${stalls.map(s => `<option>${esc(s)}</option>`).join('')}
          </select>
          <select id="cat" aria-label="Category">
            <option value="">All categories</option>
            ${categories.map(c => `<option>${esc(c)}</option>`).join('')}
          </select>
          <select id="sort" aria-label="Sort">${sortOpts}</select>
        </div>
        <div id="cards" class="cards"></div>
      </div>
      <div class="panel">
        <h2>Your cart</h2>
        <div id="cart"></div>
      </div>
    </div>`;

  ['q', 'stall', 'cat', 'sort'].forEach(id => {
    $(id).oninput = drawCards;
  });
  syncCart();
  refreshMenu();
};

function refreshMenu() {
  drawCards();
  drawCart();
}

async function refreshMenuData() {
  if (!$('cards')) return;
  await loadMenu();
  const changed = syncCart();
  refreshMenu();
  if (changed) toast('Your cart was updated because the menu changed.', 3500);
}

function drawCards() {
  const query = $('q').value.trim();
  const stall = $('stall').value;
  const category = $('cat').value;
  const lockedStall = cartStall();

  let list = query ? menuTree.search(query) : [...menuMap.values()];
  if (stall) list = list.filter(i => i.stall === stall);
  if (category) list = list.filter(i => i.category === category);
  list = mergeSort(list, CMP[$('sort').value]);

  $('cards').innerHTML = list.length
    ? list.map(i => {
        const soldOut = !i.available || i.stock === 0;
        const locked = lockedStall && lockedStall !== i.stall;
        return `
          <div class="card ${soldOut ? 'out' : ''} ${locked ? 'locked' : ''}">
            <strong>${esc(i.name)}</strong>
            <small>${esc(i.stall)} · ${esc(i.category)}</small>
            <span class="price">${peso(i.price)}</span>
            <small>${soldOut ? 'Sold out' : i.stock + ' left'}</small>
            <button class="btn primary sm" data-add="${i.id}" ${soldOut ? 'disabled' : ''}>Add to cart</button>
          </div>`;
      }).join('')
    : '<p>No dishes match your search. Try a shorter name.</p>';

  $('cards').onclick = e => e.target.dataset.add && addToCart(+e.target.dataset.add);
}

function addToCart(id) {
  const item = menuMap.get(id);
  const qty = cart.get(id) || 0;
  const lockedStall = cartStall();

  if (lockedStall && lockedStall !== item.stall) {
    toast(
      `Your cart has items from ${lockedStall}. Place that order first, then order from ${item.stall}.`,
      4000
    );
    return;
  }

  if (qty + 1 > item.stock) {
    toast(`Only ${item.stock} of ${item.name} left.`);
    return;
  }

  cart.set(id, qty + 1);
  cartUndo.push({ type: 'add', id });
  refreshMenu();
}

function removeFromCart(id) {
  const qty = cart.get(id);
  if (!qty) return;

  if (qty === 1) {
    cart.delete(id);
  } else {
    cart.set(id, qty - 1);
  }
  cartUndo.push({ type: 'remove', id });
  refreshMenu();
}

function undo() {
  const action = cartUndo.pop();
  if (!action) {
    toast('Nothing to undo.');
    return;
  }

  const qty = cart.get(action.id) || 0;

  if (action.type === 'add') {
    if (qty <= 1) {
      cart.delete(action.id);
    } else {
      cart.set(action.id, qty - 1);
    }
  } else {
    const item = menuMap.get(action.id);
    const lockedStall = cartStall();
    if (!item || !item.available || qty + 1 > item.stock) {
      toast('That item is no longer available in that quantity.', 3000);
      return;
    }
    if (lockedStall && lockedStall !== item.stall) {
      toast('Cannot undo: your cart now has items from another stall.', 3500);
      return;
    }
    cart.set(action.id, qty + 1);
  }
  refreshMenu();
}

function drawCart() {
  const box = $('cart');

  if (!cart.size) {
    box.innerHTML = `
      <p>Your cart is empty.</p>
      <p class="sub">You can order several items, but all from one stall per order.</p>`;
    return;
  }

  const rows = [...cart].map(([id, qty]) => {
    const item = menuMap.get(id);
    return `
      <tr>
        <td>${esc(item.name)}</td>
        <td>${qty}×</td>
        <td>${peso(item.price * qty)}</td>
        <td><button class="btn sm" data-rm="${id}" aria-label="Remove one ${esc(item.name)}">−</button></td>
      </tr>`;
  }).join('');

  box.innerHTML = `
    <p class="sub">Ordering from <strong>${esc(cartStall())}</strong>. To order from another stall, place this order first.</p>
    <table>${rows}</table>
    <div class="total"><span>Total</span><span>${peso(cartTotal())}</span></div>
    <button class="btn" id="undo">Undo last change</button>
    <button class="btn primary" id="place">Place order</button>`;

  box.onclick = e => {
    if (e.target.dataset.rm) removeFromCart(+e.target.dataset.rm);
  };
  $('undo').onclick = undo;
  $('place').onclick = placeOrder;
}

async function placeOrder() {
  if (placing) return;
  placing = true;

  try {
    await loadMenu();
    if (syncCart()) {
      refreshMenu();
      toast('Your cart was updated because the menu changed. Please review it.', 4000);
      return;
    }

    const lines = [...cart].map(([id, qty]) => ({ id, qty }));
    if (!lines.length) return;

    const { data: order, error } = await db.rpc('place_order', {
      p_customer_id: user.id,
      p_customer_name: user.name,
      p_items: lines,
    });

    if (error) {
      toast(error.message, 5000);
      await refreshMenuData();
      return;
    }

    const ahead = await run(
      db.from('orders')
        .select('id')
        .eq('stall', order.stall)
        .eq('status', 'pending')
        .lt('id', order.id)
    );

    cart.clear();
    cartUndo.items = [];

    $('thanks-text').textContent =
      `Order #${order.order_no} from ${order.stall} is in. ` +
      (ahead.length ? `${ahead.length} order(s) ahead of you at this stall. ` : 'You are next in line at this stall. ') +
      'You can cancel it under My orders while it is still pending. To order from another stall, place a new order.';

    $('thanks-items').innerHTML = `
      <table>
        ${order.items.map(i => `
          <tr>
            <td>${esc(i.name)}</td>
            <td>${i.qty}×</td>
            <td>${peso(i.price * i.qty)}</td>
          </tr>`).join('')}
      </table>
      <div class="total"><span>Total</span><span>${peso(order.total)}</span></div>`;

    show('thanks-view');
  } finally {
    placing = false;
  }
}

const orderCard = (order, actions = '') => `
  <div class="order ${order.status}">
    <header>
      <span>Order #${order.order_no} · ${esc(order.customer_name)}</span>
      <span class="badge ${order.status}">${order.status}</span>
    </header>
    <strong>${esc(order.stall)}</strong>
    <div>${order.items.map(i => `${i.qty}× ${esc(i.name)}`).join(', ')}</div>
    <small>${stamp(order.created_at)} · ${peso(order.total)}</small>
    <div>${actions}</div>
  </div>`;

views.history = async () => {
  const rows = await run(
    db.from('orders').select('*').eq('customer_id', user.id).order('id')
  );

  const history = new Stack();
  rows.forEach(r => history.push(r));

  const cards = history
    .toArray()
    .map(o => orderCard(
      o,
      o.status === 'pending'
        ? `<button class="btn sm danger" data-cancel="${o.id}">Cancel order</button>`
        : ''
    ))
    .join('');

  $('main').innerHTML = `
    <div class="panel">
      <h2>My orders</h2>
      <p class="sub">Order numbers start again from 1 every day. You can cancel an order only while it is pending.</p>
      ${cards || '<p>You have not ordered yet.</p>'}
    </div>`;

  $('main').onclick = async e => {
    const id = +e.target.dataset.cancel;
    if (!id) return;
    if (!confirm('Cancel this order? The items go back to the stall.')) return;

    const { error } = await db.rpc('cancel_order', {
      p_order_id: id,
      p_customer_id: user.id,
    });
    if (error) {
      toast(error.message, 5000);
    } else {
      toast('Order cancelled.');
    }
    views.history();
  };
};

async function moveOrder(id, from, to) {
  const moved = await run(
    db.from('orders')
      .update({ status: to })
      .eq('id', id)
      .eq('status', from)
      .select()
  );
  if (!moved.length) {
    toast('That order was cancelled or already changed.', 3500);
  }
}

views.queue = async () => {
  let query = db
    .from('orders')
    .select('*')
    .in('status', ['pending', 'preparing', 'ready'])
    .order('id');
  if (user.stall) query = query.eq('stall', user.stall);
  const rows = await run(query);

  let stalls;
  if (user.stall) {
    stalls = [user.stall];
  } else {
    const menuRows = await run(db.from('menu_items').select('stall'));
    stalls = [
      ...new Set([...menuRows.map(m => m.stall), ...rows.map(o => o.stall)]),
    ].sort();
  }

  if (!stalls.length) {
    $('main').innerHTML = '<div class="panel"><p>No stalls yet. Ask the admin to add menu items.</p></div>';
    return;
  }
  if (!stalls.includes(staffStall)) staffStall = stalls[0];

  const queues = new Map(stalls.map(s => [s, new Queue()]));
  rows
    .filter(o => o.status === 'pending')
    .forEach(o => queues.get(o.stall).enqueue(o));

  const queue = queues.get(staffStall);
  const stallRows = rows.filter(o => o.stall === staffStall);
  const byStatus = status => stallRows.filter(o => o.status === status);
  const next = queue.peek();

  const tabs = user.stall
    ? ''
    : `<div class="stall-tabs">${stalls.map(s => `
        <button class="btn ${s === staffStall ? 'primary' : ''}" data-stall="${esc(s)}">
          ${esc(s)} (${queues.get(s).size})
        </button>`).join('')}</div>`;

  const preparing = byStatus('preparing')
    .map(o => orderCard(o, `<button class="btn sm primary" data-from="preparing" data-s="ready" data-id="${o.id}">Mark ready</button>`))
    .join('') || '<p>Nothing cooking.</p>';

  const ready = byStatus('ready')
    .map(o => orderCard(o, `<button class="btn sm primary" data-from="ready" data-s="completed" data-id="${o.id}">Hand over</button>`))
    .join('') || '<p>Nothing to hand over.</p>';

  $('main').innerHTML = `
    ${tabs}
    <p class="sub">Showing orders for <strong>${esc(staffStall)}</strong>.</p>
    <div class="cols">
      <div class="panel">
        <h2>Waiting (${queue.size})</h2>
        <button class="btn primary" id="next" ${next ? '' : 'disabled'}>
          Prepare next${next ? ' (#' + next.order_no + ')' : ''}
        </button>
        ${queue.toArray().map(o => orderCard(o)).join('') || '<p>No orders waiting.</p>'}
      </div>
      <div class="panel">
        <h2>Preparing</h2>
        ${preparing}
      </div>
      <div class="panel">
        <h2>Ready for pickup</h2>
        ${ready}
      </div>
    </div>`;

  $('next').onclick = async () => {
    const order = queue.dequeue();
    if (!order) return;
    await moveOrder(order.id, 'pending', 'preparing');
    views.queue();
  };

  $('main').onclick = async e => {
    if (e.target.dataset.stall !== undefined) {
      staffStall = e.target.dataset.stall;
      views.queue();
      return;
    }
    if (!e.target.dataset.s) return;
    await moveOrder(+e.target.dataset.id, e.target.dataset.from, e.target.dataset.s);
    views.queue();
  };
};

views.stock = async () => {
  const rows = mergeSort((await loadMenu()).filter(inScope), CMP.name);

  $('main').innerHTML = `
    <div class="panel">
      <h2>Stock</h2>
      <table>
        <tr><th>Item</th><th>Stall</th><th>Stock</th><th>Available</th><th></th></tr>
        ${rows.map(i => `
          <tr>
            <td>${esc(i.name)}</td>
            <td>${esc(i.stall)}</td>
            <td><input type="number" min="0" value="${i.stock}" id="st${i.id}" style="width:90px"></td>
            <td><input type="checkbox" id="av${i.id}" ${i.available ? 'checked' : ''} style="width:auto"></td>
            <td><button class="btn sm primary" data-save="${i.id}">Save</button></td>
          </tr>`).join('')}
      </table>
    </div>`;

  $('main').onclick = async e => {
    const id = +e.target.dataset.save;
    if (!id) return;

    const stock = +$('st' + id).value;
    if (!valid.stock(stock)) {
      toast('Stock must be a whole number from 0 to 9999.');
      return;
    }

    await run(
      db.from('menu_items')
        .update({ stock, available: $('av' + id).checked })
        .eq('id', id)
    );
    toast('Stock saved.');
  };
};

let adminSort = 'name';
let adminQuery = '';

views.menus = async () => {
  await loadMenu();

  let list = adminQuery ? searchMenu(adminQuery) : [...menuMap.values()];
  list = mergeSort(list.filter(inScope), CMP[adminSort]);

  $('main').innerHTML = `
    <div class="grid">
      <div class="panel">
        <h2>Menu items</h2>
        <div class="toolbar">
          <input id="aq" placeholder="Search by food name or stall…" value="${esc(adminQuery)}">
          <select id="as">${sortOpts}</select>
        </div>
        <table>
          <tr><th>Name</th><th>Stall</th><th>Price</th><th>Stock</th><th></th></tr>
          ${list.map(i => `
            <tr>
              <td>${esc(i.name)}</td>
              <td>${esc(i.stall)}</td>
              <td>${peso(i.price)}</td>
              <td>${i.stock}</td>
              <td>
                <button class="btn sm" data-edit="${i.id}">Edit</button>
                <button class="btn sm danger" data-del="${i.id}">Delete</button>
              </td>
            </tr>`).join('') || '<tr><td colspan="5">No items match your search.</td></tr>'}
        </table>
      </div>
      <div class="panel">
        <h2 id="ftitle">Add item</h2>
        <input type="hidden" id="mid">
        <label>Name <input id="mn"></label>
        <label>Stall <input id="ms" value="${esc(user.stall || '')}" ${user.stall ? 'readonly' : ''}></label>
        <label>Category <input id="mc"></label>
        <label>Price <input id="mp" type="number" step="0.01"></label>
        <label>Stock <input id="mk" type="number"></label>
        <p class="msg" id="mm"></p>
        <button class="btn primary" id="msave">Save item</button>
        <button class="btn" id="mclear">Clear</button>
      </div>
    </div>`;

  $('as').value = adminSort;

  $('aq').oninput = e => {
    adminQuery = e.target.value.trim();
    views.menus().then(() => {
      const input = $('aq');
      input.focus();
      input.setSelectionRange(99, 99);
    });
  };

  $('as').onchange = e => {
    adminSort = e.target.value;
    views.menus();
  };

  $('mclear').onclick = () => views.menus();
  $('msave').onclick = saveMenuItem;

  $('main').onclick = async e => {
    if (e.target.dataset.edit) {
      const sortedById = mergeSort([...menuMap.values()], (a, b) => a.id - b.id);
      const item = binarySearch(sortedById, +e.target.dataset.edit);
      $('ftitle').textContent = 'Update item';
      $('mid').value = item.id;
      $('mn').value = item.name;
      $('ms').value = item.stall;
      $('mc').value = item.category;
      $('mp').value = item.price;
      $('mk').value = item.stock;
    }

    if (e.target.dataset.del && confirm('Delete this item?')) {
      await run(db.from('menu_items').delete().eq('id', +e.target.dataset.del));
      toast('Item deleted.');
      views.menus();
    }
  };
};

async function saveMenuItem() {
  const record = {
    name: $('mn').value.trim(),
    stall: user.stall || $('ms').value.trim(),
    category: $('mc').value.trim(),
    price: parseFloat($('mp').value),
    stock: parseInt($('mk').value, 10),
  };
  const msg = $('mm');

  if (!record.name || !record.stall || !record.category) {
    msg.textContent = 'Name, stall, and category are required.';
    return;
  }
  if (!valid.price(record.price)) {
    msg.textContent = 'Price must be more than 0 and at most 10,000.';
    return;
  }
  if (!valid.stock(record.stock)) {
    msg.textContent = 'Stock must be a whole number from 0 to 9999.';
    return;
  }

  const id = $('mid').value;
  await run(
    id
      ? db.from('menu_items').update(record).eq('id', +id)
      : db.from('menu_items').insert(record)
  );

  toast(id ? 'Item updated.' : 'Item added.');
  views.menus();
}

async function yesterdaySummary() {
  let query = db.from('orders').select('*').eq('order_date', yesterdayStr());
  if (user.stall) query = query.eq('stall', user.stall);
  const rows = await run(query);

  const done = rows.filter(o => o.status === 'completed');
  const cancelled = rows.filter(o => o.status === 'cancelled').length;
  const unfinished = rows.length - done.length - cancelled;
  const sales = done.reduce((total, o) => total + Number(o.total), 0);

  const byStall = new Map();
  const sold = new Map();
  done.forEach(o => {
    const entry = byStall.get(o.stall) || { stall: o.stall, count: 0, sales: 0 };
    entry.count++;
    entry.sales += Number(o.total);
    byStall.set(o.stall, entry);
    o.items.forEach(i => sold.set(i.name, (sold.get(i.name) || 0) + i.qty));
  });

  const best = mergeSort([...sold], (a, b) => b[1] - a[1])[0];
  const stallRows = mergeSort([...byStall.values()], (a, b) => b.sales - a.sales);

  const breakdown = !user.stall && stallRows.length
    ? `<table>
        <tr><th>Stall</th><th>Completed orders</th><th>Sales</th></tr>
        ${stallRows.map(s => `<tr><td>${esc(s.stall)}</td><td>${s.count}</td><td>${peso(s.sales)}</td></tr>`).join('')}
      </table>`
    : '';

  return `
    <div class="panel summary">
      <h2>Yesterday's sales summary · ${yesterdayStr()}</h2>
      ${rows.length ? `
        <div class="stats">
          <div class="stat"><b>${peso(sales)}</b>Total sales</div>
          <div class="stat"><b>${done.length}</b>Completed orders</div>
          <div class="stat"><b>${cancelled}</b>Cancelled</div>
          <div class="stat"><b>${unfinished}</b>Not completed</div>
        </div>
        ${best ? `<p>Best seller: <strong>${esc(best[0])}</strong> (${best[1]} sold)</p>` : ''}
        ${breakdown}` : '<p>There were no orders yesterday.</p>'}
    </div>`;
}

let orderSort = 'id-desc';

views.orders = async () => {
  let query = db.from('orders').select('*');
  if (user.stall) query = query.eq('stall', user.stall);
  const rows = await run(query);
  const summary = await yesterdaySummary();

  const comparers = {
    'id-desc': (a, b) => b.id - a.id,
    'id-asc': (a, b) => a.id - b.id,
    'total-desc': (a, b) => b.total - a.total,
    stall: (a, b) => a.stall.localeCompare(b.stall) || b.id - a.id,
    status: (a, b) => a.status.localeCompare(b.status),
  };

  const list = mergeSort(rows, comparers[orderSort]);
  const today = rows.filter(o => o.order_date === todayStr());
  const waiting = rows.filter(o => o.status === 'pending').length;
  const salesToday = today
    .filter(o => o.status === 'completed')
    .reduce((total, o) => total + Number(o.total), 0);

  $('main').innerHTML = `
    ${summary}
    <div class="stats">
      <div class="stat"><b>${today.length}</b>Orders today</div>
      <div class="stat"><b>${waiting}</b>Waiting</div>
      <div class="stat"><b>${peso(salesToday)}</b>Completed sales today</div>
    </div>
    <div class="panel">
      <div class="toolbar">
        <select id="os">
          <option value="id-desc">Newest first</option>
          <option value="id-asc">Oldest first</option>
          <option value="total-desc">Highest total</option>
          <option value="stall">By stall</option>
          <option value="status">Status</option>
        </select>
      </div>
      ${list
        .map(o => orderCard(o, `<button class="btn sm danger" data-delo="${o.id}">Delete</button>`))
        .join('') || '<p>No orders yet.</p>'}
    </div>`;

  $('os').value = orderSort;
  $('os').onchange = e => {
    orderSort = e.target.value;
    views.orders();
  };

  $('main').onclick = async e => {
    if (e.target.dataset.delo && confirm('Delete this order?')) {
      await run(db.from('orders').delete().eq('id', +e.target.dataset.delo));
      views.orders();
    }
  };
};

views.users = async () => {
  let query = db.from('users').select('id,username,full_name,role,stall');
  if (user.stall) query = query.eq('stall', user.stall).eq('role', 'staff');
  const accounts = await run(query);
  const menuRows = await run(db.from('menu_items').select('stall'));
  const stalls = [...new Set(menuRows.map(m => m.stall))].sort();

  const rows = mergeSort(
    accounts,
    (a, b) => a.role.localeCompare(b.role) || a.username.localeCompare(b.username)
  );

  const form = user.stall
    ? `<p class="sub">New staff accounts will work only for <strong>${esc(user.stall)}</strong>.</p>`
    : `<label>Account type
         <select id="ur">
           <option value="staff">Staff</option>
           <option value="admin">Stall admin</option>
         </select>
       </label>
       <label>Stall
         <input id="us" list="stall-list" placeholder="Required for stall admin">
       </label>
       <datalist id="stall-list">${stalls.map(s => `<option value="${esc(s)}">`).join('')}</datalist>
       <p class="sub">Leave the stall empty to let a staff member see every stall.</p>`;

  $('main').innerHTML = `
    <div class="grid">
      <div class="panel">
        <h2>Accounts</h2>
        <table>
          <tr><th>Username</th><th>Name</th><th>Role</th><th>Stall</th><th></th></tr>
          ${rows.map(u => `
            <tr>
              <td>${esc(u.username)}</td>
              <td>${esc(u.full_name)}</td>
              <td>${u.role}</td>
              <td>${esc(u.stall || (u.role === 'customer' ? '' : 'All stalls'))}</td>
              <td>${u.id === user.id ? '' : `<button class="btn sm danger" data-delu="${u.id}">Delete</button>`}</td>
            </tr>`).join('')}
        </table>
      </div>
      <div class="panel">
        <h2>Add account</h2>
        <label>Full name <input id="un"></label>
        <label>Username <input id="uu"></label>
        <label>Password <input id="up" type="password"></label>
        ${form}
        <p class="msg" id="um"></p>
        <button class="btn primary" id="usave">Add account</button>
      </div>
    </div>`;

  $('usave').onclick = async () => {
    const name = $('un').value.trim();
    const username = $('uu').value.trim();
    const password = $('up').value;
    const role = user.stall ? 'staff' : $('ur').value;
    const stall = user.stall || $('us').value.trim() || null;
    const msg = $('um');

    if (!valid.name(name)) {
      msg.textContent = 'Name: letters only, 2-40 characters.';
      return;
    }
    if (!valid.username(username)) {
      msg.textContent = 'Username: 3-20 letters, numbers, or underscores.';
      return;
    }
    if (!valid.password(password)) {
      msg.textContent = 'Password must be at least 6 characters.';
      return;
    }
    if (role === 'admin' && !stall) {
      msg.textContent = 'A stall admin needs a stall.';
      return;
    }
    if (stall && !stalls.includes(stall)) {
      msg.textContent = 'The stall must match a stall on the menu. Add its menu items first.';
      return;
    }

    const { error } = await db.from('users').insert({
      username,
      full_name: name,
      password_hash: await sha256(password),
      role,
      stall,
    });

    if (error) {
      msg.textContent = error.code === '23505' ? 'That username is taken.' : error.message;
      return;
    }

    toast('Account added.');
    views.users();
  };

  $('main').onclick = async e => {
    if (e.target.dataset.delu && confirm('Delete this account?')) {
      await run(db.from('users').delete().eq('id', +e.target.dataset.delu));
      views.users();
    }
  };
};

if (user) {
  enterApp();
} else {
  show('login-view');
}