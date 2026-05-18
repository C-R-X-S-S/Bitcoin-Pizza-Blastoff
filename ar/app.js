(function () {
  const MODEL_URL = './assets/hot_air_food_truck_ar.glb'
  const OVERHEAD_METERS = 3.05
  const FORWARD_METERS = 0.9
  const MAX_DEVICE_PIXEL_RATIO = 2

  const canvas = document.getElementById('camerafeed')
  const launch = document.getElementById('launch')
  const startButton = document.getElementById('startButton')
  const statusEl = document.getElementById('status')
  const hud = document.getElementById('hud')
  const hudText = document.getElementById('hudText')
  const recenterButton = document.getElementById('recenterButton')
  const unsupported = document.getElementById('unsupported')

  let xrStarted = false
  let truckRoot
  let truckModel
  let mixer
  let clock
  let xrScene

  function viewportSize() {
    const vv = window.visualViewport
    const doc = document.documentElement
    const widths = [
      window.innerWidth,
      doc.clientWidth,
      vv ? vv.width : 0,
    ]
    const heights = [
      window.innerHeight,
      doc.clientHeight,
      vv ? vv.height : 0,
      screen && screen.height ? Math.min(screen.height, screen.width * 2.4) : 0,
    ]

    return {
      width: Math.max(320, Math.round(Math.max(...widths.filter(Boolean)))),
      height: Math.max(480, Math.round(Math.max(...heights.filter(Boolean)))),
      left: 0,
      top: 0,
    }
  }

  function syncViewportSize() {
    const size = viewportSize()
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO)

    document.documentElement.style.setProperty('--app-height', `${size.height}px`)
    document.documentElement.style.setProperty('--app-width', `${size.width}px`)

    canvas.style.left = `${size.left}px`
    canvas.style.top = `${size.top}px`
    canvas.style.width = `${size.width}px`
    canvas.style.height = `${size.height}px`

    canvas.width = Math.round(size.width * dpr)
    canvas.height = Math.round(size.height * dpr)

    if (xrScene && xrScene.renderer) {
      xrScene.renderer.setPixelRatio(dpr)
      xrScene.renderer.setSize(size.width, size.height, false)
      xrScene.renderer.setViewport(0, 0, size.width, size.height)
      xrScene.renderer.setScissor(0, 0, size.width, size.height)
      xrScene.renderer.setScissorTest(false)
    }
  }

  function setStatus(message) {
    statusEl.textContent = message
  }

  function showUnsupported(message) {
    launch.hidden = true
    unsupported.hidden = false
    unsupported.querySelector('p').textContent = message
  }

  function isLikelyMobile() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  }

  function hasCameraAPI() {
    return Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  }

  function waitForEngine() {
    return new Promise((resolve, reject) => {
      const started = Date.now()
      const timer = setInterval(() => {
        if (window.XR8 && window.THREE && window.THREE.GLTFLoader) {
          clearInterval(timer)
          resolve(window.XR8)
          return
        }

        if (Date.now() - started > 12000) {
          clearInterval(timer)
          reject(new Error('AR engine did not load. Check the network connection and HTTPS hosting.'))
        }
      }, 100)
    })
  }

  function normalizeModel(object) {
    const box = new THREE.Box3().setFromObject(object)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)

    object.position.sub(center)
    const targetHeightMeters = 1.8
    const scale = targetHeightMeters / Math.max(size.y, 0.001)
    object.scale.setScalar(scale)
  }

  function recenterTruck() {
    if (!truckRoot) return
    truckRoot.position.set(0, OVERHEAD_METERS, -FORWARD_METERS)
    truckRoot.rotation.set(0, 0, 0)
    hudText.textContent = 'Point your phone at the sky'
  }

  function loadTruckModel() {
    return new Promise((resolve, reject) => {
      const loader = new THREE.GLTFLoader()
      loader.load(
        MODEL_URL,
        (gltf) => {
          truckModel = gltf.scene
          normalizeModel(truckModel)
          truckModel.rotation.y = Math.PI
          truckRoot.add(truckModel)

          if (gltf.animations && gltf.animations.length) {
            mixer = new THREE.AnimationMixer(truckModel)
            gltf.animations.forEach((clip) => mixer.clipAction(clip).play())
          }

          resolve()
        },
        undefined,
        reject
      )
    })
  }

  function overheadTruckModule() {
    return {
      name: 'overhead-truck-module',
      onCanvasSizeChange: syncViewportSize,
      onVideoSizeChange: syncViewportSize,
      onDeviceOrientationChange: syncViewportSize,
      onStart: async () => {
        xrScene = XR8.Threejs.xrScene()
        const {scene, renderer} = xrScene

        renderer.outputEncoding = THREE.sRGBEncoding
        syncViewportSize()
        clock = new THREE.Clock()

        const hemi = new THREE.HemisphereLight(0xffffff, 0x28402e, 1.45)
        scene.add(hemi)

        const sun = new THREE.DirectionalLight(0xfff0c2, 1.25)
        sun.position.set(2.5, 5, 1.5)
        scene.add(sun)

        truckRoot = new THREE.Group()
        scene.add(truckRoot)
        recenterTruck()

        try {
          hudText.textContent = 'Loading truck...'
          await loadTruckModel()
          hudText.textContent = 'Point your phone at the sky'
        } catch (error) {
          hudText.textContent = 'Model failed to load'
          console.error(error)
        }
      },
      onUpdate: () => {
        syncViewportSize()

        if (!truckRoot) return

        const elapsed = performance.now() * 0.001
        truckRoot.position.y = OVERHEAD_METERS + Math.sin(elapsed * 1.1) * 0.08
        truckRoot.rotation.y += 0.003

        if (mixer && clock) {
          mixer.update(clock.getDelta())
        }
      },
    }
  }

  async function startAR() {
    if (xrStarted) return
    startButton.disabled = true
    setStatus('Starting camera...')

    try {
      const XR8 = await waitForEngine()

      if (!hasCameraAPI()) {
        showUnsupported('This browser does not expose camera access. Open the link in Safari or Chrome on a phone.')
        return
      }

      XR8.XrController.configure({
        disableWorldTracking: false,
      })

      const modules = []

      if (window.XRExtras && window.XRExtras.FullWindowCanvas) {
        modules.push(window.XRExtras.FullWindowCanvas.pipelineModule())
      }

      modules.push(
        XR8.GlTextureRenderer.pipelineModule(),
        XR8.Threejs.pipelineModule(),
        XR8.XrController.pipelineModule(),
        overheadTruckModule()
      )

      XR8.addCameraPipelineModules(modules)

      syncViewportSize()
      XR8.run({canvas})
      xrStarted = true
      launch.hidden = true
      hud.hidden = false
    } catch (error) {
      console.error(error)
      setStatus(error.message || 'AR failed to start.')
      startButton.disabled = false
    }
  }

  recenterButton.addEventListener('click', recenterTruck)
  startButton.addEventListener('click', startAR)
  window.addEventListener('resize', syncViewportSize)
  window.addEventListener('orientationchange', () => setTimeout(syncViewportSize, 350))

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncViewportSize)
    window.visualViewport.addEventListener('scroll', syncViewportSize)
  }

  syncViewportSize()

  if (!isLikelyMobile()) {
    setStatus('Ready. Test the final QR on a phone over HTTPS.')
  } else {
    setStatus('Ready for camera.')
    syncViewportSize()

    waitForEngine()
      .then(() => setStatus('Ready for camera.'))
      .catch((error) => setStatus(error.message))
  }
})()
