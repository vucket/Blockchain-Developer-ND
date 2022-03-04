import DOM from "./dom";
import Contract from "./contract";
import "./flightsurety.css";

(async () => {
  let result = null;

  let contract = new Contract("localhost", () => {
    // Read transaction
    contract.isOperational((error, result) => {
      console.log(error, result);
      display("Operational Status", "Check if contract is operational", [
        { label: "Operational Status", error: error, value: result },
      ]);
      const createEl = (flightInfo) => {
        const el = document.createElement("option");
        el.text = `${flightInfo.flightCode} - ${new Date(
          flightInfo.timestamp
        )}`;
        el.value = JSON.stringify(flightInfo);
        return el;
      };
      contract.flights.forEach((flightInfo) => {
        DOM.flightSelector1.add(createEl(flightInfo));
        DOM.flightSelector2.add(createEl(flightInfo));
        DOM.flightSelector3.add(createEl(flightInfo));
      });
    });

    // User-submitted transaction
    DOM.elid("submit-oracle").addEventListener("click", () => {
      const flight = DOM.elid("flight-number").value;
      // Write transaction
      contract.fetchFlightStatus(flight, (error, result) => {
        display("Oracles", "Trigger oracles", [
          {
            label: "Fetch Flight Status",
            error: error,
            value: result.flight + " " + result.timestamp,
          },
        ]);
      });
    });

    DOM.elid("fund").addEventListener("click", () => {
      const value = DOM.elid("fundAmount").value;

      contract.fundAirline(value, (error, result) => {
        display("DApp", "Fund", [
          {
            label: "Fund",
            error: error,
            value: result,
          },
        ]);
      });
    });

    DOM.elid("buyInsurance").addEventListener("click", () => {
      const flightInfo = JSON.parse(DOM.flightSelector1.value);
      const value = DOM.elid("buyInsuranceAmount").value;

      contract.buyInsurance(flightInfo, value, (error, result) => {
        display("DApp", "buyInsurance", [
          {
            label: "buyInsurance",
            error: error,
            value: result,
          },
        ]);
      });
    });
    DOM.elid("claimInsurance").addEventListener("click", () => {
      const flightInfo = JSON.parse(DOM.flightSelector2.value);

      contract.claimInsurance(flightInfo, (error, result) => {
        display("DApp", "claimInsurance", [
          {
            label: "claimInsurance",
            error: error,
            value: result,
          },
        ]);
      });
    });
    DOM.elid("payCredit").addEventListener("click", () => {
      const passenger = DOM.elid("payCreditUser").value;
      const flightInfo = JSON.parse(DOM.flightSelector3.value);

      contract.payCredit(passenger, flightInfo, (error, result) => {
        display("DApp", "payCredit", [
          {
            label: "payCredit",
            error: error,
            value: result,
          },
        ]);
      });
    });
  });
})();

function display(title, description, results) {
  let displayDiv = DOM.elid("display-wrapper");
  let section = DOM.section();
  section.appendChild(DOM.h2(title));
  section.appendChild(DOM.h5(description));
  results.map((result) => {
    let row = section.appendChild(DOM.div({ className: "row" }));
    row.appendChild(DOM.div({ className: "col-sm-4 field" }, result.label));
    row.appendChild(
      DOM.div(
        { className: "col-sm-8 field-value" },
        result.error ? String(result.error) : String(result.value)
      )
    );
    section.appendChild(row);
  });
  displayDiv.append(section);
}
