export function resultForId (resultSet, id)
{
    if (!resultSet) return null;

    for (let result of resultSet)
        if (result.id === id)
            return result.descriptor;

    return null;
}

export function evaluateCondition (condition, senseResults)
{
    let terms = condition.split("+");
    for (let term of terms)
    {
        let factors = term.split("^");
        let termMatched = true;
        for (let factor of factors)
        {
            let sensor = factor.trim ();
            let invert = false;
            if (sensor[0] == '!') {
                invert = true;
                sensor = sensor.substring(1).trim();
            }
            let result = resultForId(senseResults, sensor);
            if (result === null) {
                if (invert) continue;
                termMatched = false;
                break;
            }
            if (invert) {
                termMatched = false;
                break;
            }
        }
        if (termMatched) {
            return true;
        }
    }
}
