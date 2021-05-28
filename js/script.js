'use strict';

// Get all inputs from the form
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
// const editBtn = document.querySelector('.edit__btn');
// const deleteBtn = document.querySelector('.delete__btn');

// Create the Parent class Workout
class Workout {
  date = new Date();
  // Giving in id to the workout by taking the last 10 caracters from date
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }
  //Set the description to be showed on the Popups
  _setDescription() {
    // prettier-ignore
    const months = ['January','February','March','April','May','June','July','August','September',
    'October','November','December',];

    // Setting the first Letter of the Workout type to UpperCase.
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

// The first child class - Workout type --> Running
class Running extends Workout {
  //Setting the type property to know what type of workout
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    //Calling this functions on the constructor so they can be executed when we crate an Object from this Class
    this._calcPace();
    this._setDescription();
  }

  _calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

// The Second child class - Workout type --> Cycling
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationgain) {
    super(coords, distance, duration);
    this.elevationgain = elevationgain;
    //Calling this functions on the constructor so they can be executed when we crate an Object from this Class
    this._setDescription();
    this._calcSpeed();
  }

  _calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class App {
  //Creating protected properties for our App
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  // Table to containe all our Workouts [Running,Cycling]
  #workouts = [];
  constructor() {
    //Get User position
    this._getPosition();
    //Attach Event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    // Here i will use the event delegation because the form i want to add the event listener to it doesn't existe yet.
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', e => {
      e.target.classList.contains('delete__btn') ||
      e.target.classList.contains('edit__btn')
        ? this._deleteEditWorkout(e)
        : this._moveToPopup(e);
    });
    //deleteBtn.addEventListener('click', _deleteWorkout(e).bind(this));

    // Get data from local storage if there is already some workouts created by the user so we call this function in the constructor of our App
    this._getLocalStorage();
  }

  _getPosition() {
    //Check if the browser support the Geolocation
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        // we call the loadMap method with the bind function to set the this keyword to our object because here its called like a handler so the this keyword will be undefined
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    // Using Structuring to get position coords [latitude, longitude]
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    // setting our map Object with two parametres / Coords and the mapZomLevel
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // a function like the addEventListener used by this map API
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  //Function to show the form after the Click on the map
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    //Clear input fields
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value =
      '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _newWorkout(e) {
    // Check if the inputs are positive Numbers with the Every function / giving a table as parameter /using spread operator

    // To prevent our form to load the page
    e.preventDefault();
    //Get Data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If activity is running, create running object.
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if Data is Valid if not we will return immediately.
      if (!this._validateForm(distance, duration, cadence))
        return alert('inputs have to be a positive number');
      // Create a new running Object if data is Valid
      workout = new Running([lat, lng], distance, duration, cadence);
      //console.log(workout);
    }
    // If activity is cycling, create cycling object.
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (!this._validateForm(distance, duration, elevation))
        return alert('inputs have to be a number');
      workout = new Cycling([lat, lng], distance, duration, elevation);
      //console.log(workout);
    }
    // Add the workout [Cycling,Running] to our Table Workouts
    this.#workouts.push(workout);

    // Render workout on map as marker.
    this._renderWorkoutMarker(workout);

    // Render workout on list.
    this._renderWorkout(workout);

    this._hideForm();
    //console.log(mapEvent);

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  // Function to render the Marker on the map it take a workout as parameter
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      // Set the Popup content
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    // Adding our workout to the Dom / this function take one parameter [Workout Object]
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <div class="workout__actions">
        <button class="actions__btns delete__btn"></button>
        <button class="actions__btns edit__btn"></button>
      </div>
      <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
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
    // Check if the workout is Running or Cycling because there are some differences between them.
    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationgain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;
    // Insert our workout to the Dom with insertAdjacentHTML
    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    //console.log(e.target);
    const workoutEl = e.target.closest('.workout');
    //console.log(workoutEl);
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    //console.log(workout);
    if (!e.target.classList.contains('actions__btns'))
      this.#map.setView(workout.coords, this.#mapZoomLevel, {
        animate: true,
        pane: {
          duration: 1,
        },
      });
  }

  _setLocalStorage() {
    // Convert data from Object to string because the setItem accept a string parameter
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    //console.log(data);
    //guard clause to return if data don't existe
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  _deleteEditWorkout(e) {
    //console.log(e.target);
    const workoutEl = e.target.closest('.workout');
    //console.log(workoutEl);
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    //console.log(workout);
    const index = this.#workouts.findIndex(elm => elm.id === workout.id);
    //console.log(indexToDelete);
    if (e.target.classList.contains('delete__btn'))
      this.#workouts.splice(index, 1);
    // if (e.target.classList.contains('edit__btn')) {
    //   inputDistance.value = workout.distance;
    //   inputDuration.value = workout.duration;
    //   if (workout.type === 'running') {
    //     this._toggleElevationField();
    //     inputCadence.value = workout.cadence;
    //     this._showForm();
    //   }
    //   if (workout.type === 'cycling') {
    //     this._toggleElevationField();
    //     inputElevation.value = workout.elevationgain;
    //     this._showForm();
    //   }
    // }
    this._resetWorkout();
  }
  _resetWorkout() {
    localStorage.removeItem('workouts');
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    location.reload();
  }
  _validateForm(...inputs) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const positiveInputs = (...inputes) => inputes.every(inp => inp > 0);
    return validInputs(...inputs) && positiveInputs(...inputs) ? true : false;
  }
}

const app = new App();

//Note//
// when we convert our data from object to String then we convert data to Object again we lost the prototype chaine when working with the local storage API.

// Created by JELTI Ihab
// Webiste -> www.jeltiihab.com
// Email -> ihab.jelti@gmail.com
