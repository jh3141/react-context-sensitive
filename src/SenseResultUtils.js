export function resultForId (resultSet, id)
{
    if (!resultSet) return null;
    
    for (let result of resultSet)
        if (result.id === id)
            return result.descriptor;

    return null;
}
