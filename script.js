"use strict";

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

class Workout {
  date = new Date();
  id = uuid.v4();
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in mins
  }

  _setDescription() {
    // Running on April 14
    const formattedDate = new Intl.DateTimeFormat(undefined, {
      month: "long",
      day: "2-digit",
    }).format(this.date);

    this.description = `${this.type === "running" ? "🏃‍♂️" : ""} ${
      this.type[0].toUpperCase() + this.type.slice(1)
    } on ${formattedDate}`;
  }

  incrementClick() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();

    this._setDescription();
  }

  calcPace() {
    // Pace in mins/km
    this.pace = this.duration / this.distance;
  }
}

class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();

    this._setDescription();
  }

  calcSpeed() {
    // Speed in km/hr
    this.speed = this.distance / (this.duration / 60);
  }
}

class App {
  #map;
  #coordinates;
  workouts = [];
  workoutMarkers = [];

  constructor() {
    // Get GeoLocation of the user
    this._getCurrentPosition();

    // Get workouts from local storage
    this.getLocalStorage();

    // Event handlers
    inputType.addEventListener("change", this._toggleCadeneElevation.bind(this));
    form.addEventListener("submit", this._submitForm.bind(this));
    containerWorkouts.addEventListener('click', this._workoutClick.bind(this));
  }

  _getCurrentPosition() {
    // Async function
    navigator.geolocation.getCurrentPosition(
      this._initMap.bind(this),
      function () {
        console.log("Unable to fetch coordinates");
      }
    );
  }

  _initMap(position) {
    // Initialize leaflet map instance
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, 13);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on("click", this._displayForm.bind(this));

    if (this.workouts) {
      this.workouts.forEach(workout => this._renderMarker(workout));
    }
  }

  _displayForm(mapEvent) {
    // Dislay workout form
    const { lat, lng } = mapEvent.latlng;
    this.#coordinates = [lat, lng];

    form.classList.remove("hidden");
    inputDistance.focus();
  }

  _toggleCadeneElevation() {
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _submitForm(e) {
    // Perform validation and add the workout to UI
    e.preventDefault();

    const areValidNumbers = function (...values) {
      return values.every((value) => Number.isFinite(+value));
    };

    const arePositiveNumbers = function (...values) {
      return values.every((value) => +value > 0);
    };

    let newWorkout;

    // Running
    if (inputType.value === "running") {
      if (
        !areValidNumbers(
          inputDistance.value,
          inputDuration.value,
          inputCadence.value
        )
      ) {
        return alert("Inputs are not valid numbers");
      }

      if (
        !arePositiveNumbers(
          inputDistance.value,
          inputDuration.value,
          inputCadence.value
        )
      ) {
        return alert("Inputs are not positive numbers");
      }

      newWorkout = new Running(
        this.#coordinates,
        inputDistance.value,
        inputDuration.value,
        inputCadence.value
      );
    }

    // Cycling
    if (inputType.value === "cycling") {
      if (
        !areValidNumbers(
          inputDistance.value,
          inputDuration.value,
          inputElevation.value
        )
      ) {
        return alert("Inputs are not valid numbers");
      }

      if (!arePositiveNumbers(inputDistance.value, inputDuration.value)) {
        return alert("Inputs are not positive numbers");
      }

      newWorkout = new Cycling(
        this.#coordinates,
        inputDistance.value,
        inputDuration.value,
        inputElevation.value
      );
    }

    this.workouts.push(newWorkout);

    this._renderMarker(newWorkout);
    
    this._renderWorkoutInList(newWorkout);

    this.setLocalStorage();

    this._hideForm();
  }

  setLocalStorage() {
    // Save workouts array to local storage
    localStorage.setItem('workouts', JSON.stringify(this.workouts));
  }

  getLocalStorage() {
    // Fetch workouts from local storage and render them on UI
    const workouts = JSON.parse(localStorage.getItem('workouts'));

    // Guard Clause
    if (!workouts) return;

    this.workouts = workouts.map(workout => {
      let workoutObj;

      if (workout.type === 'cycling') {
        workoutObj = new Cycling(workout.coords, workout.distance, workout.duration, workout.elevationGain);
      }

      if (workout.type === 'running') {
        workoutObj = new Running(workout.coords, workout.distance, workout.duration, workout.cadence);
      }

      return workoutObj;
    });

    this.workouts.forEach(workout => {
      this._renderWorkoutInList(workout);
    });
  }

  _hideForm() {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        "";

    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  _renderWorkoutInList(workout) {
    // Render a workout on UI
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <div class="workout__header">
    <h2 class="workout__title">${workout.description}</h2>
    <span class="workout__icon workout__icon--delete">x</span>
    </div>
        <div class="workout__details">
        <span class="workout__icon">${
          workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === "running") {
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">spm</span>
        </div>
        </li>
        `;
    }

    if (workout.type === "cycling") {
      html += `
        <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
      </li>
        `;
    }

    form.insertAdjacentHTML("afterend", html);
  }

  _renderWorkoutList() {
    // Re-render all workouts on UI
    containerWorkouts.querySelectorAll('li').forEach(liEl => {
      console.log(liEl);
      liEl.remove();
    });

    this.workouts.forEach(workout => this._renderWorkoutInList(workout));
  }
  

  _renderMarker(workout) {
    // Render workout on leaflet map
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(workout.description, {
        autoClose: false,
        closeOnClick: false,
        className: `${workout.type}-popup`,
      })
      .openPopup();

      this.workoutMarkers.push(marker);
  }

  _workoutClick(e) {
    // Handler function - Either deletes a workout or locates the workout on leaflet map
    if (e.target.classList.contains('workout__icon--delete')) {
      this._deleteWorkout(e.target.closest('.workout'));

    } else if (e.target.closest('.workout')) {
      this._scrollToWorkout(e.target.closest('.workout'));
    }
  }

  _deleteWorkout(workoutEl) {
    // Delete a workout
    const workoutId = workoutEl.dataset.id;

    const workoutIndex = this.workouts.findIndex(workout => workout.id == workoutId);

    this.workouts.splice(workoutIndex, 1);

    this.workoutMarkers[workoutIndex].remove();

    this.workoutMarkers.splice(workoutIndex, 1);

    this._renderWorkoutList();

    this.setLocalStorage();
  }

  _scrollToWorkout(workoutEl) {

    const workout = this.workouts.find(workout => workout.id === workoutEl.dataset.id);
    
    this.#map.setView(workout.coords, this.#map.getZoom(), {
      animate: true,
      duration: 1
    });

    // Increasing number of clicks
    workout.incrementClick();
  }

}

const app = new App();
