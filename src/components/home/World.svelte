<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import worldData from "../../lib/world.json";

  export let mode: "card" | "dialog" = "card";

  let mapContainer: HTMLDivElement;
  let rotationTimer: d3.Timer | null = null;
  let resizeObserver: ResizeObserver | null = null;

  const visitedCountries = [
    "France",
    "Italy",
    "Germany",
    "Spain",
    "USA",
    "Switzerland",
  ];

  function getDimensions() {
    if (!mapContainer) return null;

    const width = mapContainer.clientWidth;
    if (!width) return null;

    if (mode === "dialog") {
      const isMobile = window.matchMedia("(max-width: 640px)").matches;
      const minHeight = isMobile ? 240 : 320;
      const maxHeight = isMobile ? 360 : 520;
      const height = Math.max(minHeight, Math.min(maxHeight, width * 0.68));

      return { width, height };
    }

    return { width, height: 220 };
  }

  function renderGlobe() {
    if (!mapContainer) return;

    const dimensions = getDimensions();
    if (!dimensions) return;

    const { width, height } = dimensions;
    const autoRotateSensitivity = 75;
    const sphereRadius = Math.min(width, height) * (mode === "dialog" ? 0.45 : 0.5);

    rotationTimer?.stop();
    d3.select(mapContainer).selectAll("*").remove();

    const projection = d3
      .geoOrthographic()
      .scale(sphereRadius)
      .center([0, 0])
      .rotate([0, -30])
      .translate([width / 2, height / 2]);

    const pathGenerator = d3.geoPath().projection(projection);

    const svg = d3
      .select(mapContainer)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("cursor", "grab");

    // Globe background
    svg
      .append("circle")
      .attr("fill", "#EEE")
      .attr("stroke", "#000")
      .attr("stroke-width", 0.2)
      .attr("cx", width / 2)
      .attr("cy", height / 2)
      .attr("r", sphereRadius);

    const map = svg.append("g");

    const countries = map
      .append("g")
      .attr("class", "countries")
      .selectAll("path")
      .data(worldData.features)
      .enter()
      .append("path")
      .attr("d", (d: any) => pathGenerator(d))
      .attr("fill", (d: any) =>
        visitedCountries.includes(d.properties.name) ? "#2e8b57" : "white",
      )
      .style("stroke", "black")
      .style("stroke-width", 0.3)
      .style("opacity", 0.9);

    countries
      .on("mouseover", function (event: MouseEvent, d: any) {
        d3.select(this as SVGPathElement).attr("fill", "#E63946");
      })
      .on("mouseout", function (event: MouseEvent, d: any) {
        d3.select(this as SVGPathElement).attr(
          "fill",
          visitedCountries.includes(d.properties.name) ? "#2e8b57" : "white",
        );
      })
      .on("click", function (event: MouseEvent, d: any) {
        console.log("Clicked:", d.properties.name);
      });

    // Drag to rotate
    let isDragging = false;

    const drag = d3
      .drag<SVGSVGElement, unknown>()
      .on("start", () => {
        isDragging = true;
        svg.style("cursor", "grabbing");
      })
      .on("drag", (event) => {
        const rotate = projection.rotate();
        const dragSensitivity = 0.5;

        projection.rotate([
          rotate[0] + event.dx * dragSensitivity,
          rotate[1] - event.dy * dragSensitivity,
        ]);

        svg.selectAll("path").attr("d", (d: any) => pathGenerator(d));
      })
      .on("end", () => {
        isDragging = false;
        svg.style("cursor", "grab");
      });

    svg.call(drag as any);

    // Auto rotation (pauses during drag)
    rotationTimer = d3.timer(() => {
      if (isDragging) return;

      const rotate = projection.rotate();
      const k = autoRotateSensitivity / projection.scale();

      projection.rotate([rotate[0] - 1 * k, rotate[1]]);
      svg.selectAll("path").attr("d", (d: any) => pathGenerator(d));
    }, 200);
  }

  onMount(() => {
    if (!mapContainer) return;

    renderGlobe();

    resizeObserver = new ResizeObserver(() => {
      renderGlobe();
    });
    resizeObserver.observe(mapContainer);

    return () => {
      resizeObserver?.disconnect();
      rotationTimer?.stop();
    };
  });
</script>

<div class="flex flex-col text-white justify-center items-center w-full h-full">
  <div class="w-full" bind:this={mapContainer}></div>
</div>
