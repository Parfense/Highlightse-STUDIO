// НАСТОЯЩАЯ 3D WEBGL СЦЕНА НА THREE.JS + АВТОРИЗАЦИЯ БЕЗ ПАРОЛЕЙ
let scene, camera, renderer, crystals = [], mouseX = 0, mouseY = 0;

function initThreeJS() {
    const canvas = document.getElementById('webgl-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 26;

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x10b981, 2.2, 100);
    pointLight1.position.set(15, 15, 15);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x34d399, 1.8, 100);
    pointLight2.position.set(-15, -10, 10);
    scene.add(pointLight2);

    // Создаём 3D изумрудные геодезические кристаллы и торы
    const geometries = [
        new THREE.IcosahedronGeometry(3.2, 0),
        new THREE.OctahedronGeometry(2.6, 0),
        new THREE.TorusKnotGeometry(2.0, 0.55, 80, 16),
        new THREE.DodecahedronGeometry(2.8, 0)
    ];

    const positions = [
        [-16, 7, -5], [17, -6, -8], [-14, -9, -4], [15, 9, -6], [0, 11, -12]
    ];

    positions.forEach((pos, idx) => {
        const geo = geometries[idx % geometries.length];
        const mat = new THREE.MeshPhysicalMaterial({
            color: 0x10b981,
            metalness: 0.15,
            roughness: 0.2,
            transparent: true,
            opacity: 0.38,
            wireframe: idx % 2 === 1
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(pos[0], pos[1], pos[2]);
        scene.add(mesh);
        crystals.push({ mesh, speedX: 0.003 + idx * 0.001, speedY: 0.004 + idx * 0.001 });
    });

    window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 4;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 4;
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    function animate() {
        requestAnimationFrame(animate);
        crystals.forEach((c, i) => {
            c.mesh.rotation.x += c.speedX;
            c.mesh.rotation.y += c.speedY;
            c.mesh.position.y += Math.sin(Date.now() * 0.001 + i) * 0.008;
        });
        camera.position.x += (mouseX - camera.position.x) * 0.04;
        camera.position.y += (-mouseY - camera.position.y) * 0.04;
        camera.lookAt(scene.position);
        renderer.render(scene, camera);
    }
    animate();
}

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('studio_theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('studio_theme', 'dark');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('studio_theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    initThreeJS();
});

// Переключение вкладок Вход / Регистрация
function setAuthMode(mode) {
    document.getElementById('btn-tab-login').classList.toggle('active', mode === 'login');
    document.getElementById('btn-tab-reg').classList.toggle('active', mode === 'register');
    document.getElementById('form-login').style.display = mode === 'login' ? 'flex' : 'none';
    document.getElementById('form-register').style.display = mode === 'register' ? 'flex' : 'none';
    document.getElementById('auth-error').style.display = 'none';
}

function showError(msg) {
    const err = document.getElementById('auth-error');
    err.textContent = msg;
    err.style.display = 'block';
}

function instantLogin(username) {
    fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
    })
    .then(r => r.json())
    .then(res => {
        if (res.ok) window.location.href = res.redirect;
        else showError(res.error);
    });
}

function handleLogin(e) {
    e.preventDefault();
    instantLogin(document.getElementById('in-login').value);
}

function handleRegister(e) {
    e.preventDefault();
    const payload = {
        first_name: document.getElementById('reg-fn').value,
        last_name: document.getElementById('reg-ln').value,
        dob: document.getElementById('reg-dob').value,
        username: document.getElementById('reg-un').value
    };
    fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(res => {
        if (res.ok) window.location.href = res.redirect;
        else showError(res.error);
    });
}
