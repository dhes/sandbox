import * as types from "../actions/action-types";
import produce from "immer";
// import store from '../store/store'; // DH Delete me!

const initialState = {
  defaultPatientId: "smart-1288992",
  defaultUser: "Practitioner/COREPRACTITIONER1",
  currentUser: "",
  currentPatient: {
    id: "smart-1288992",
    name: "Daniel X. Adams",
    birthDate: "1925-12-23",
    patientResource: {},
    conditionsResources: [],
  },
};

const patientReducers = (state = initialState, action) => {
  if (action.type) {
    switch (action.type) {
      // Store Patient resource from successful connection to patient in context from FHIR server
      case types.GET_PATIENT_SUCCESS: {
        const { patient } = action;
        const familyName = Array.isArray(patient.name[0].family)
          ? patient.name[0].family.join(" ")
          : patient.name[0].family;
        const fullName = `${patient.name[0].given.join(" ")} ${familyName}`;
        const newPatient = {
          id: patient.id,
          name: fullName,
          birthDate: patient.birthDate,
          patientResource: patient,
        };

        let filteredEntries = [];
        if (action.conditions && action.conditions.total > 0) {
          const conditionCodes = [];
          filteredEntries = action.conditions.entry.filter((item) => {
            const { resource } = item;
            const hasAppropriateCode =
              resource &&
              resource.code &&
              resource.code.coding &&
              resource.code.coding[0] &&
              resource.code.coding[0].code;
            if (hasAppropriateCode) {
              const isDuplicate = conditionCodes.indexOf(
                resource.code.coding[0].code
              );
              if (isDuplicate < 0) {
                conditionCodes.push(resource.code.coding[0].code);
                return true;
              }
              return false;
            }
            return false;
          });
        }
        filteredEntries = filteredEntries.sort((a, b) => {
          if (a.resource.code.text < b.resource.code.text) {
            return -1;
          }
          if (b.resource.code.text < a.resource.code.text) {
            return 1;
          }
          return 0;
        });
        newPatient.conditionsResources = filteredEntries;
        return { ...state, currentPatient: newPatient };
      }

      // Stores the current user ID in store if specified in an access token returned to the Sandbox (on SMART launched Sandbox)
      case types.SMART_AUTH_SUCCESS: {
        const { authResponse } = action;
        if (authResponse && authResponse.userId) {
          return { ...state, currentUser: authResponse.userId };
        }
        return state;
      }

      // Add race and ethnicity to current patient as a step toward implementing a takeSuggestion // DH
      case types.ADD_RACE_AND_ETHNICITY: {
        // DH
        console.log(state.currentPatient.patientResource);
        let usCoreRace = [
          {
            url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race",
            extension: [
              {
                url: "ombCategory",
                valueCoding: {
                  system: "urn:oid:2.16.840.1.113883.6.238",
                  code: "2106-3",
                  display: "White",
                },
              },
              {
                url: "text",
                valueString: "White",
              },
            ],
          },
        ];
        return produce(state, (draftState) => {
          // eslint-disable-next-line no-param-reassign
          draftState.currentPatient.patientResource.extension = usCoreRace;
        });

        // return {
        //   ...state,
        //   patientResource: { ...state.currentUser.patientResource, usCoreRace },
        // }; // DH
      }

      default: {
        return state;
      }
    }
  }
  return state;
};

export default patientReducers;
